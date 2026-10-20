import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const events = [];
const getNextDevelopmentVersion = mock.fn();
const updateVersionInFiles = mock.fn();
const checkout = mock.fn();
const add = mock.fn();
const commit = mock.fn();
const push = mock.fn();

mock.module('simple-git', { defaultExport: () => ({ checkout, add, commit, push }) });
mock.module('./git.js', { namedExports: {
  branchExists: async () => false,
  createBranch: async () => events.push('branch'),
  createAndPushTag: async () => events.push('tag')
} });
mock.module('./github.js', { namedExports: {
  createGitHubRelease: async () => events.push('release'),
  openReleasesPage: async () => null
} });
mock.module('./ui.js', { namedExports: { getNextDevelopmentVersion } });
mock.module('./version.js', { namedExports: { updateVersionInFiles } });
const { createNewBetaBranch } = await import('./release.js');

beforeEach(() => {
  events.length = 0;
  for (const fn of [getNextDevelopmentVersion, updateVersionInFiles, checkout, add, commit, push]) {
    fn.mock.resetCalls();
  }
});

test('chooses the version before publishing and commits that version afterward', async () => {
  getNextDevelopmentVersion.mock.mockImplementation(async () => {
    events.push('choose-version');
    return '1.2.1';
  });
  await createNewBetaBranch('1.2.0', 'main');
  assert.deepEqual(events, ['choose-version', 'branch', 'tag', 'release']);
  assert.deepEqual(updateVersionInFiles.mock.calls[0].arguments, ['1.2.0', '1.2.1']);
  assert.deepEqual(checkout.mock.calls[0].arguments, ['main']);
  assert.deepEqual(commit.mock.calls[0].arguments, ['chore: Bump to 1.2.1']);
  assert.deepEqual(push.mock.calls[0].arguments, [['origin', 'main']]);
});

test('publishes the beta without changing the base branch when the bump is skipped', async () => {
  getNextDevelopmentVersion.mock.mockImplementation(async () => null);
  await createNewBetaBranch('1.2.0', 'main');
  assert.deepEqual(events, ['branch', 'tag', 'release']);
  for (const fn of [updateVersionInFiles, checkout, add, commit, push]) {
    assert.equal(fn.mock.callCount(), 0);
  }
});

test('cancelling the version prompt stops before creating a branch or tag', async () => {
  getNextDevelopmentVersion.mock.mockImplementation(async () => { throw new Error('cancelled'); });
  await assert.rejects(createNewBetaBranch('1.2.0', 'main'), /cancelled/);
  assert.deepEqual(events, []);
  assert.equal(updateVersionInFiles.mock.callCount(), 0);
});
