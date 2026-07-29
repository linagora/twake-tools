import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main, USAGE } from '../src/cli.js';

test('lists every sub-command in the usage text', () => {
  assert.match(USAGE, /cozy-bender apps update <env> <instances>/);
  assert.match(USAGE, /cozy-bender flags set {3}<env> <instances>/);
  assert.match(USAGE, /cozy-bender flags list {2}<env> <instance>/);
});

test('exits 1 with usage when no sub-command is given', async () => {
  const lines = [];
  const code = await main([], { log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /cozy-bender apps update/);
});

test('prints usage and exits 0 on an explicit help request', async () => {
  for (const arg of ['--help', '-h', 'help']) {
    const lines = [];
    const code = await main([arg], { log: (l) => lines.push(l) });
    assert.equal(code, 0);
    assert.doesNotMatch(lines.join('\n'), /Unknown command/);
    assert.match(lines.join('\n'), /cozy-bender apps update/);
  }
});

test('exits 1 on an unknown sub-command', async () => {
  const lines = [];
  const code = await main(['wat'], { log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Unknown command: wat/);
});

test('exits 1 on a known group with an unknown action', async () => {
  const lines = [];
  const code = await main(['flags', 'wat'], { log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Unknown command: flags wat/);
});

test('routes "apps update" to the apps handler', async () => {
  const lines = [];
  const code = await main(['apps', 'update', 'prod'], { log: (l) => lines.push(l), token: 'tok' });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender apps update/);
});

// A typo in a COMMANDS key would silently turn a whole sub-command into
// "Unknown command" while every direct-import handler test stayed green.
test('routes "flags set" to the flags handler', async () => {
  const lines = [];
  const code = await main(['flags', 'set', 'prod'], { log: (l) => lines.push(l), token: 'tok' });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender flags set/);
});

test('routes "flags list" to the flags handler', async () => {
  const lines = [];
  const code = await main(['flags', 'list', 'prod'], { log: (l) => lines.push(l), token: 'tok' });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /Usage: cozy-bender flags list/);
});
