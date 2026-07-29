import { test } from 'node:test';
import assert from 'node:assert/strict';
import { styles, ok, fail, summaryLine } from '../src/output.js';

test('styles are empty when colour is disabled', () => {
  assert.deepEqual(styles(false), { bold: '', dim: '', green: '', red: '', reset: '' });
});

test('styles are ANSI codes when colour is enabled', () => {
  assert.equal(styles(true).green, '\x1b[32m');
});

test('ok and fail mark their line', () => {
  assert.equal(ok('done'), '✔ done');
  assert.equal(fail('nope'), '✘ nope');
});

test('ok and fail colour their mark when given styles', () => {
  const s = styles(true);
  assert.equal(ok('done', s), `${s.green}✔${s.reset} done`);
  assert.equal(fail('nope', s), `${s.red}✘${s.reset} nope`);
});

test('summary reports every operation succeeding', () => {
  assert.equal(
    summaryLine({ total: 3, failures: [], label: 'instance(s) updated' }),
    '3/3 instance(s) updated'
  );
});

test('summary lists the failures', () => {
  assert.equal(
    summaryLine({ total: 3, failures: ['a.cozy', 'b.cozy'], label: 'instance(s) updated' }),
    '1/3 instance(s) updated — failed: a.cozy, b.cozy'
  );
});

test('summary colours the count red when something failed', () => {
  const line = summaryLine({ total: 2, failures: ['a.cozy'], label: 'x' }, styles(true));
  assert.match(line, /^\x1b\[31m\x1b\[1m1\/2 x\x1b\[0m/);
});

test('summary colours the count green when everything succeeded', () => {
  const line = summaryLine({ total: 2, failures: [], label: 'x' }, styles(true));
  assert.match(line, /^\x1b\[32m\x1b\[1m2\/2 x\x1b\[0m/);
});
