import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const tags = [];
const isGitRepository = mock.fn(async () => true);
const showMainMenu = mock.fn(async () => 'quit');
const getNextDevelopmentVersion = mock.fn(async () => null);
const confirmCreation = mock.fn(async () => true);
const confirmFinalRelease = mock.fn(async () => true);

mock.module('execa', { namedExports: { execa: async () => null } });
mock.module('simple-git', { defaultExport: () => ({ checkout: async () => null }) });
mock.module('./config.js', { namedExports: {
  error: message => { throw new Error(message); },
  info: () => null,
  success: () => null,
  warning: () => null
} });
mock.module('./git.js', { namedExports: {
  isGitRepository,
  checkoutAndPull: async () => null,
  hasUncommittedChanges: async () => false,
  detectBaseBranch: async () => 'main',
  getLatestReleaseBranch: async () => 'release/1.2.0',
  branchExists: async () => false,
  tagExists: async () => false,
  createBranch: async () => null,
  createAndPushTag: async tag => tags.push(tag),
  fetchTags: async () => null,
  getVersionFromBranch: branch => branch.replace('release/', ''),
  getLatestBeta: async () => '1.2.0-beta.1'
} });
mock.module('./version.js', { namedExports: {
  fetchAppVersion: async () => '1.3.0',
  incrementBeta: () => '1.2.0-beta.2'
} });
mock.module('./ui.js', { namedExports: {
  showMainMenu, getNextDevelopmentVersion, confirmCreation, confirmFinalRelease
} });
const { main } = await import('./index.js');

beforeEach(() => {
  tags.length = 0;
  for (const fn of [isGitRepository, showMainMenu, getNextDevelopmentVersion, confirmCreation, confirmFinalRelease]) {
    fn.mock.resetCalls();
  }
});

const cases = [
  ['new-beta', '1.3.0-beta.1', getNextDevelopmentVersion, ['1.3.0', 'main', '1.4.0']],
  ['add-beta', '1.2.0-beta.2', confirmCreation, ['1.2.0-beta.2', true]],
  ['final-release', '1.2.0', confirmFinalRelease, ['1.2.0', true]]
];

for (const [action, tag, prompt, promptArgs] of cases) {
  test(`--action ${action} skips the menu and answers its prompt from the flags`, async () => {
    await main(['--action', action, '--next-version', '1.4.0', '--yes']);
    assert.equal(showMainMenu.mock.callCount(), 0);
    assert.deepEqual(prompt.mock.calls[0].arguments, promptArgs);
    assert.deepEqual(tags, [tag]);
  });
}

test('keeps the prompts when the flags are absent', async () => {
  showMainMenu.mock.mockImplementationOnce(async () => 'add-beta');
  await main([]);
  assert.equal(showMainMenu.mock.callCount(), 1);
  assert.deepEqual(confirmCreation.mock.calls[0].arguments, ['1.2.0-beta.2', false]);
});

test('rejects an unknown action before touching Git or GitHub', async () => {
  await assert.rejects(main(['--action', 'ship']), /--action must be one of/);
  assert.equal(isGitRepository.mock.callCount(), 0);
});
