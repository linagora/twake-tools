import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const input = mock.fn();
const confirm = mock.fn();
mock.module('@inquirer/prompts', {
  namedExports: { input, select: mock.fn(), confirm }
});
mock.module('./config.js', { namedExports: {
  error: message => { throw new Error(message); }
} });
const { getNextDevelopmentVersion, confirmCreation, confirmFinalRelease } = await import('./ui.js');

test('suggests the next minor version and accepts a chosen patch version', async () => {
  input.mock.mockImplementation(async options => {
    assert.equal(options.default, '1.3.0');
    assert.match(options.message, /main/);
    for (const version of ['1.2.1', '1.3.0', '2.0.0', 'skip']) {
      assert.equal(options.validate(version), true);
    }
    for (const version of ['1.2.0', '1.1.9', '1.3.0-beta.1', '1.3.0+build', 'v1.3.0', '01.3.0', '', 'invalid']) {
      assert.equal(typeof options.validate(version), 'string');
    }
    return '1.2.1';
  });
  assert.equal(await getNextDevelopmentVersion('1.2.0', 'main'), '1.2.1');
});

test('allows skipping the development version bump', async () => {
  input.mock.mockImplementation(async () => 'skip');
  assert.equal(await getNextDevelopmentVersion('1.2.0', 'main'), null);
});

test('uses a valid preset development version without prompting', async () => {
  input.mock.resetCalls();
  assert.equal(await getNextDevelopmentVersion('1.2.0', 'main', '1.2.1'), '1.2.1');
  assert.equal(await getNextDevelopmentVersion('1.2.0', 'main', 'skip'), null);
  assert.equal(input.mock.callCount(), 0);
});

test('rejects an invalid preset development version without prompting', async () => {
  input.mock.resetCalls();
  for (const version of ['1.2.0', 'v1.3.0', '1.3.0-beta.1']) {
    await assert.rejects(getNextDevelopmentVersion('1.2.0', 'main', version), /--next-version/);
  }
  assert.equal(input.mock.callCount(), 0);
});

test('skips the confirmations with yes', async () => {
  confirm.mock.resetCalls();
  assert.equal(await confirmCreation('1.2.0-beta.2', true), true);
  assert.equal(await confirmFinalRelease('1.2.0', true), true);
  assert.equal(confirm.mock.callCount(), 0);
});
