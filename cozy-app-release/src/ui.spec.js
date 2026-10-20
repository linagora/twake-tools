import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const input = mock.fn();
mock.module('@inquirer/prompts', {
  namedExports: { input, select: mock.fn(), confirm: mock.fn() }
});
const { getNextDevelopmentVersion } = await import('./ui.js');

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
