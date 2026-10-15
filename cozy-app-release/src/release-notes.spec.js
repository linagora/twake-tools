import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, mock, test } from 'node:test';

const execa = mock.fn(async () => null);
const isGitRepository = mock.fn(async () => true);
const checkoutAndPull = mock.fn(async () => null);
const showMainMenu = mock.fn(async () => 'new-beta');

mock.module('execa', { namedExports: { execa } });
mock.module('simple-git', { defaultExport: () => ({ checkout: async () => null }) });
mock.module('./config.js', { namedExports: {
  error: message => { throw new Error(message); },
  info: () => null,
  success: () => null,
  warning: () => null
} });
mock.module('./git.js', { namedExports: {
  isGitRepository,
  checkoutAndPull,
  hasUncommittedChanges: async () => false,
  detectBaseBranch: async () => 'main',
  getLatestReleaseBranch: async () => 'release/1.2.0',
  branchExists: async () => false,
  tagExists: async () => false,
  createBranch: async () => null,
  createAndPushTag: async () => null,
  fetchTags: async () => null,
  getVersionFromBranch: branch => branch.replace('release/', ''),
  getLatestBeta: async () => '1.2.0-beta.1'
} });
mock.module('./ui.js', { namedExports: {
  showMainMenu,
  getNextDevelopmentVersion: async () => null,
  confirmCreation: async () => true,
  confirmFinalRelease: async () => true
} });
const { main } = await import('./index.js');

beforeEach(() => {
  for (const fn of [execa, isGitRepository, checkoutAndPull, showMainMenu]) {
    fn.mock.resetCalls();
  }
  checkoutAndPull.mock.mockImplementation(async () => null);
  showMainMenu.mock.mockImplementation(async () => 'new-beta');
});

async function makeNotesFile(t, contents) {
  const directory = await mkdtemp(join(tmpdir(), 'cozy-release-notes-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'release notes.md');
  await writeFile(path, contents);
  return path;
}

for (const choice of ['new-beta', 'add-beta', 'final-release']) {
  test(`publishes prepared notes unchanged for ${choice}, even after a checkout`, async t => {
    const notes = '## New features\n\n- Choose files. (#42)\n\nLiteral `code`, $value, and $(text).\n';
    const path = await makeNotesFile(t, notes);
    checkoutAndPull.mock.mockImplementation(async () => writeFile(path, 'Different branch content'));
    showMainMenu.mock.mockImplementation(async () => choice);
    await main(['--notes-file', path]);
    const calls = execa.mock.calls.filter(call => call.arguments[1][0] === 'release');
    assert.equal(calls.length, 1);
    const [command, args, options] = calls[0].arguments;
    assert.equal(command, 'gh');
    assert.deepEqual(args.slice(args.indexOf('--notes-file'), args.indexOf('--notes-file') + 2), ['--notes-file', '-']);
    assert.equal(args.includes('--generate-notes'), false);
    assert.equal(args.includes('--prerelease'), choice !== 'final-release');
    assert.equal(options.input, notes);
  });
}

test('keeps GitHub-generated notes when no file is supplied', async () => {
  await main([]);
  const call = execa.mock.calls.find(call => call.arguments[1][0] === 'release');
  assert.equal(call.arguments[1].includes('--generate-notes'), true);
  assert.equal(call.arguments[1].includes('--notes-file'), false);
  assert.equal(call.arguments[2].stdin, 'ignore');
});

test('rejects empty or missing notes before touching Git or GitHub', async t => {
  const path = await makeNotesFile(t, ' \n');
  await assert.rejects(main(['--notes-file', path]), /must not be empty/);
  await assert.rejects(main(['--notes-file', `${path}.missing`]), /ENOENT/);
  assert.equal(isGitRepository.mock.callCount(), 0);
  assert.equal(execa.mock.callCount(), 0);
});

test('rejects a missing option value before touching Git or GitHub', async () => {
  await assert.rejects(main(['--notes-file']), /argument missing/i);
  assert.equal(isGitRepository.mock.callCount(), 0);
  assert.equal(execa.mock.callCount(), 0);
});
