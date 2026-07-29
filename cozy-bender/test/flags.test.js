import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlagArg, parseFlagArgs, buildFlagSet, flagsSet, formatFlags, flagsList } from '../src/flags.js';

test('parses JSON values', () => {
  assert.deepEqual(parseFlagArg('a.flag=true'), { name: 'a.flag', value: true });
  assert.deepEqual(parseFlagArg('a.flag=100'), { name: 'a.flag', value: 100 });
  assert.deepEqual(parseFlagArg('a.flag=[1,2]'), { name: 'a.flag', value: [1, 2] });
  assert.deepEqual(parseFlagArg('a.flag=null'), { name: 'a.flag', value: null });
});

test('falls back to a raw string when the value is not JSON', () => {
  assert.deepEqual(parseFlagArg('a.flag=dark'), { name: 'a.flag', value: 'dark' });
});

test('accepts an explicitly quoted string', () => {
  assert.deepEqual(parseFlagArg('a.flag="dark"'), { name: 'a.flag', value: 'dark' });
});

test('splits on the first = so values may contain more', () => {
  assert.deepEqual(parseFlagArg('a.flag=x=y'), { name: 'a.flag', value: 'x=y' });
});

test('an empty value is the empty string', () => {
  assert.deepEqual(parseFlagArg('a.flag='), { name: 'a.flag', value: '' });
});

test('rejects an argument without =', () => {
  assert.throws(() => parseFlagArg('a.flag'), /expected name=value/);
});

test('rejects an empty flag name', () => {
  assert.throws(() => parseFlagArg('=true'), /flag name/);
});

test('parseFlagArgs rejects an empty list', () => {
  assert.throws(() => parseFlagArgs([]), /at least one/);
});

test('builds the request path and body', () => {
  const { path, body } = buildFlagSet({
    env: 'prod',
    instance: 'a.cozy',
    name: 'a.flag',
    value: true,
  });
  assert.equal(path, '/instances/prod/a.cozy/features');
  assert.equal(body.name, 'a.flag');
  assert.equal(body.source, 'instance');
});

test('sets every flag on every instance', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ path: new URL(url).pathname, body: JSON.parse(init.body) });
    return new Response('{}', { status: 200 });
  };
  const lines = [];
  const code = await flagsSet(['prod', 'a.cozy,b.cozy', 'x.flag=true', 'y.flag=dark'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 0);
  assert.equal(calls.length, 4);
  assert.deepEqual(
    calls.map((c) => `${c.path} ${c.body.name}`),
    [
      '/instances/prod/a.cozy/features x.flag',
      '/instances/prod/a.cozy/features y.flag',
      '/instances/prod/b.cozy/features x.flag',
      '/instances/prod/b.cozy/features y.flag',
    ]
  );
  const out = lines.join('\n');
  assert.match(out, /Setting 2 flag\(s\) on 2 instance\(s\) \(env: prod\)/);
  assert.match(out, /✔ x\.flag = true/);
  assert.match(out, /✔ y\.flag = "dark"/);
  assert.match(out, /4\/4 flag update\(s\) applied/);
});

test('names the instance and the flag of each failure', async () => {
  const fetchImpl = async (url, init) =>
    JSON.parse(init.body).name === 'y.flag'
      ? new Response('{"error":"unknown flag"}', { status: 400 })
      : new Response('{}', { status: 200 });
  const lines = [];
  const code = await flagsSet(['prod', 'a.cozy', 'x.flag=true', 'y.flag=1'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  const out = lines.join('\n');
  assert.match(out, /✘ y\.flag — HTTP 400, unknown flag/);
  assert.match(out, /1\/2 flag update\(s\) applied — failed: a\.cozy \(y\.flag\)/);
});

test('rejects a malformed pair before calling Bender', async () => {
  let called = false;
  const lines = [];
  const code = await flagsSet(['prod', 'a.cozy', 'x.flag=true', 'oops'], {
    fetchImpl: async () => {
      called = true;
      return new Response('{}', { status: 200 });
    },
    token: 'tok',
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  assert.equal(called, false);
  assert.match(lines.join('\n'), /expected name=value/);
});

test('exits 1 with usage when arguments are missing', async () => {
  const lines = [];
  const code = await flagsSet(['prod'], { token: 'tok', log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender flags set/);
});

test('formats effective flags and their sources', () => {
  const lines = formatFlags({
    features: { 'a.flag': true, 'b.flag': 'dark' },
    sources: [
      { id: 'io.cozy.settings.flags.instance', attributes: { 'a.flag': true } },
      { id: 'io.cozy.settings.context', attributes: { 'b.flag': 'dark' } },
    ],
  });
  const out = lines.join('\n');
  assert.match(out, /a\.flag = true/);
  assert.match(out, /b\.flag = "dark"/);
  assert.match(out, /io\.cozy\.settings\.flags\.instance/);
  assert.match(out, /io\.cozy\.settings\.context/);
});

test('says so when an instance has no flags', () => {
  assert.match(formatFlags({ features: {}, sources: [] }).join('\n'), /No flags set/);
});

test('tolerates a response without a sources array', () => {
  const out = formatFlags({ features: { 'a.flag': 1 } }).join('\n');
  assert.match(out, /a\.flag = 1/);
});

test('lists the flags of one instance', async () => {
  let path;
  const fetchImpl = async (url) => {
    path = new URL(url).pathname;
    return new Response('{"features":{"a.flag":true},"sources":[]}', { status: 200 });
  };
  const lines = [];
  const code = await flagsList(['prod', 'a.cozy'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 0);
  assert.equal(path, '/instances/prod/a.cozy/features');
  assert.match(lines.join('\n'), /a\.flag = true/);
});

test('reports a failed read and exits 1', async () => {
  const fetchImpl = async () => new Response('{"error":"Instance not found"}', { status: 404 });
  const lines = [];
  const code = await flagsList(['prod', 'a.cozy'], {
    fetchImpl,
    token: 'tok',
    isTTY: false,
    log: (l) => lines.push(l),
  });

  assert.equal(code, 1);
  assert.match(lines.join('\n'), /HTTP 404, Instance not found/);
});

test('exits 1 with usage when the instance is missing', async () => {
  const lines = [];
  const code = await flagsList(['prod'], { token: 'tok', log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender flags list/);
});
