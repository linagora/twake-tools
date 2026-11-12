import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const events = [];
const getNextDevelopmentVersion = mock.fn();
const updateVersionInFiles = mock.fn();
const checkout = mock.fn();
const add = mock.fn();
const commit = mock.fn();
const push = mock.fn();
const checkoutLocalBranch = mock.fn();
const branch = mock.fn();
const createPullRequest = mock.fn();

mock.module('simple-git', { defaultExport: () => ({ checkout, checkoutLocalBranch, branch, add, commit, push }) });
mock.module('./git.js', { namedExports: {
  branchExists: async () => false,
  createBranch: async () => events.push('branch'),
  createAndPushTag: async () => events.push('tag')
} });
mock.module('./github.js', { namedExports: {
  createGitHubRelease: async () => events.push('release'),
  createPullRequest,
  openReleasesPage: async () => null
} });
mock.module('./ui.js', { namedExports: { getNextDevelopmentVersion } });
mock.module('./version.js', { namedExports: { updateVersionInFiles } });
const { createNewBetaBranch } = await import('./release.js');

beforeEach(() => {
  events.length = 0;
  for (const fn of [getNextDevelopmentVersion, updateVersionInFiles, checkout, checkoutLocalBranch, branch, add, commit, push, createPullRequest]) {
    fn.mock.resetCalls();
  }
  push.mock.mockImplementation(async () => null);
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

test('opens a pull request for the bump when the base branch refuses the push', async () => {
  getNextDevelopmentVersion.mock.mockImplementation(async () => '1.2.1');
  push.mock.mockImplementationOnce(async () => { throw new Error('protected branch hook declined'); });
  await createNewBetaBranch('1.2.0', 'main');
  assert.deepEqual(checkoutLocalBranch.mock.calls[0].arguments, ['chore/bump-1.2.1']);
  assert.deepEqual(branch.mock.calls[0].arguments, [['-f', 'main', 'origin/main']]);
  assert.deepEqual(push.mock.calls[1].arguments, [['-u', 'origin', 'chore/bump-1.2.1']]);
  const { baseBranch, headBranch } = createPullRequest.mock.calls[0].arguments[0];
  assert.deepEqual({ baseBranch, headBranch }, { baseBranch: 'main', headBranch: 'chore/bump-1.2.1' });
  assert.deepEqual(checkout.mock.calls.at(-1).arguments, ['main']);
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
