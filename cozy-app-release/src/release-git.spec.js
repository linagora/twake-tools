import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

function runGit(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function makeRepository(t) {
  const root = mkdtempSync(join(tmpdir(), 'cozy-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git');
  const local = join(root, 'local');
  const other = join(root, 'other');
  runGit(root, 'init', '--bare', '--initial-branch=main', remote);
  runGit(root, 'clone', remote, local);
  runGit(local, 'config', 'user.name', 'Release test');
  runGit(local, 'config', 'user.email', 'release@example.test');
  runGit(local, 'config', 'pull.rebase', 'false');
  for (const file of ['package.json', 'manifest.webapp']) {
    writeFileSync(join(local, file), '{"version": "1.2.0"}\n');
  }
  runGit(local, 'add', '.');
  runGit(local, 'commit', '-m', 'Initial version');
  runGit(local, 'push', 'origin', 'main');
  runGit(root, 'clone', remote, other);
  runGit(other, 'config', 'user.name', 'Other developer');
  runGit(other, 'config', 'user.email', 'other@example.test');
  return { remote, local, other };
}

function saveCommit(cwd, file) {
  writeFileSync(join(cwd, file), file);
  runGit(cwd, 'add', file);
  runGit(cwd, 'commit', '-m', file);
  return runGit(cwd, 'rev-parse', 'HEAD');
}

function runRelease(cwd, file, expression) {
  const url = new URL(file, import.meta.url).href;
  return execFileSync(process.execPath, [
    '--input-type=module', '-e', `import * as release from ${JSON.stringify(url)}; await ${expression};`
  ], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
}

test('fast-forwards the base branch to the remote commit', t => {
  const { local, other } = makeRepository(t);
  const head = saveCommit(other, 'remote-change');
  runGit(other, 'push', 'origin', 'main');
  runRelease(local, './git.js', 'release.checkoutAndPull("main")');
  assert.equal(runGit(local, 'rev-parse', 'HEAD'), head);
});

test('refuses to merge a diverged base branch', t => {
  const { local, other } = makeRepository(t);
  const head = saveCommit(local, 'local-change');
  saveCommit(other, 'remote-change');
  runGit(other, 'push', 'origin', 'main');
  assert.throws(() => runRelease(local, './git.js', 'release.checkoutAndPull("main")'), /fast-forward/i);
  assert.equal(runGit(local, 'rev-parse', 'HEAD'), head);
  assert.equal(runGit(local, 'status', '--porcelain'), '');
});

test('pushes a normal version bump', t => {
  const { local, remote } = makeRepository(t);
  runRelease(local, './release.js', 'release.bumpVersionOnMaster("1.2.0", "main", "1.2.1")');
  assert.equal(runGit(local, 'rev-parse', 'HEAD'), runGit(remote, 'rev-parse', 'main'));
  for (const file of ['package.json', 'manifest.webapp']) {
    assert.equal(JSON.parse(readFileSync(join(local, file), 'utf8')).version, '1.2.1');
  }
});

test('does not overwrite a known remote commit when pushing a version bump', t => {
  const { local, other, remote } = makeRepository(t);
  const remoteHead = saveCommit(other, 'remote-change');
  runGit(other, 'push', 'origin', 'main');
  runGit(local, 'fetch', 'origin');
  assert.throws(() => runRelease(local, './release.js', 'release.bumpVersionOnMaster("1.2.0", "main", "1.2.1")'), /rejected|non-fast-forward/i);
  assert.equal(runGit(remote, 'rev-parse', 'main'), remoteHead);
});

test('rejects package versions that cannot be compared as stable versions', t => {
  const { local } = makeRepository(t);
  for (const version of ['01.2.0', '1.2.0-beta.1', '99999999999999999999.0.0']) {
    writeFileSync(join(local, 'package.json'), JSON.stringify({ version }));
    assert.throws(() => runRelease(local, './version.js', 'release.getPackageVersion()'), /Unable to read valid version/);
  }
});

const invalidReleaseRefs = [
  'origin/release/toto_1.49.0',
  'origin/release/9.0.0-beta.1',
  'origin/release/9.0.0+build',
  'origin/release/v9.0.0',
  'origin/release/01.0.0',
  'origin/release/9.0',
  'origin/release/99999999999999999999.0.0',
  'upstream/release/9.0.0',
  'upstream/origin/release/9.0.0',
  'origin/feature/origin/release/9.0.0'
];

for (const { name, refs, expected } of [
  {
    name: 'ignores malformed release branches and branches from other remotes',
    refs: [...invalidReleaseRefs, 'origin/release/1.108.0'],
    expected: 'release/1.108.0'
  },
  {
    name: 'selects the greatest stable release version',
    refs: ['origin/release/1.99.0', 'origin/release/1.108.10', 'origin/release/0.999.999', 'origin/release/1.108.9'],
    expected: 'release/1.108.10'
  },
  {
    name: 'returns null when all release branch names are invalid',
    refs: invalidReleaseRefs,
    expected: null
  },
  {
    name: 'returns null when no release branches exist',
    refs: [],
    expected: null
  }
]) {
  test(name, t => {
    const { local } = makeRepository(t);
    for (const ref of refs) {
      runGit(local, 'update-ref', `refs/remotes/${ref}`, 'HEAD');
    }
    const result = runRelease(local, './git.js',
      'process.stdout.write(JSON.stringify(await release.getLatestReleaseBranch()))');
    assert.equal(JSON.parse(result.toString()), expected);
  });
}
