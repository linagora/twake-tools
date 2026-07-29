import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAppsUpdateArgs, buildSource, buildAppUpdate, appsUpdate } from '../src/apps.js';

test('parses the full argument list', () => {
  const parsed = parseAppsUpdateArgs(['prod', 'a.cozy,b.cozy', 'home', 'cozy/cozy-home', 'dev', 'false']);
  assert.deepEqual(parsed, {
    env: 'prod',
    instances: ['a.cozy', 'b.cozy'],
    slug: 'home',
    repo: 'cozy/cozy-home',
    branch: 'dev',
    force: false,
  });
});

test('defaults branch to build and force to true', () => {
  const parsed = parseAppsUpdateArgs(['prod', 'a.cozy', 'home', 'cozy/cozy-home']);
  assert.equal(parsed.branch, 'build');
  assert.equal(parsed.force, true);
});

test('rejects a missing argument', () => {
  assert.throws(() => parseAppsUpdateArgs(['prod', 'a.cozy', 'home']), /Usage/);
});

test('rejects a repo without an organisation', () => {
  assert.throws(
    () => parseAppsUpdateArgs(['prod', 'a.cozy', 'home', 'cozy-home']),
    /must include the organization/
  );
});

test('rejects a force value that is not true or false', () => {
  assert.throws(
    () => parseAppsUpdateArgs(['prod', 'a.cozy', 'home', 'cozy/cozy-home', 'build', 'yes']),
    /force must be/
  );
});

test('drops empty entries from the instance list', () => {
  assert.deepEqual(
    parseAppsUpdateArgs(['prod', 'a.cozy,,b.cozy,', 'home', 'cozy/cozy-home']).instances,
    ['a.cozy', 'b.cozy']
  );
});

test('builds the git source from repo and branch', () => {
  assert.equal(
    buildSource({ repo: 'cozy/cozy-home', branch: 'build' }),
    'git://github.com/cozy/cozy-home.git#build'
  );
});

test('builds the request path and body', () => {
  assert.deepEqual(
    buildAppUpdate({
      env: 'prod',
      instance: 'a.cozy',
      slug: 'home',
      repo: 'cozy/cozy-home',
      branch: 'build',
      force: true,
    }),
    {
      path: '/instances/prod/a.cozy/apps/home',
      body: { force: true, source: 'git://github.com/cozy/cozy-home.git#build' },
    }
  );
});

test('updates every instance and reports success', async () => {
  const paths = [];
  const fetchImpl = async (url) => {
    paths.push(new URL(url).pathname);
    return new Response('{"data":{"attributes":{"version":"1.2.3","state":"ready"}}}', { status: 200 });
  };
  const lines = [];
  const code = await appsUpdate(['prod', 'a.cozy,b.cozy', 'home', 'cozy/cozy-home'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 0);
  assert.deepEqual(paths, ['/instances/prod/a.cozy/apps/home', '/instances/prod/b.cozy/apps/home']);
  const out = lines.join('\n');
  assert.match(out, /✔ a\.cozy: updated \(version 1\.2\.3, state ready\)/);
  assert.match(out, /2\/2 instance\(s\) updated/);
});

test('keeps going after a failure and exits 1', async () => {
  const fetchImpl = async (url) =>
    url.includes('a.cozy')
      ? new Response('{"error":"Instance not found"}', { status: 404 })
      : new Response('{}', { status: 200 });
  const lines = [];
  const code = await appsUpdate(['prod', 'a.cozy,b.cozy', 'home', 'cozy/cozy-home'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  const out = lines.join('\n');
  assert.match(out, /✘ a\.cozy: HTTP 404, Instance not found/);
  assert.match(out, /✔ b\.cozy: updated/);
  assert.match(out, /1\/2 instance\(s\) updated — failed: a\.cozy/);
});

test('exits 1 with usage on bad arguments, without calling Bender', async () => {
  let called = false;
  const lines = [];
  const code = await appsUpdate(['prod'], {
    fetchImpl: async () => {
      called = true;
      return new Response('{}', { status: 200 });
    },
    token: 'tok',
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  assert.equal(called, false);
  assert.match(lines.join('\n'), /Usage/);
});
