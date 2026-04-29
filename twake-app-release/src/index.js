import * as git from './git.js';
import * as version from './version.js';
import * as github from './github.js';
import * as ui from './ui.js';
import * as release from './release.js';
import { error, success, info } from './config.js';

export async function main() {
  // Check prerequisites
  const isGitRepo = await git.isGitRepository();
  if (!isGitRepo) {
    error('This script must be run in a git repository');
  }

  const hasGh = await github.checkGhCli();
  if (!hasGh) {
    error('gh CLI is not installed. Install it from: https://cli.github.com/');
  }

  const isGhAuth = await github.checkGhAuth();
  if (!isGhAuth) {
    error('gh CLI is not authenticated. Run: gh auth login');
  }

  const hasUncommitted = await git.hasUncommittedChanges();
  if (hasUncommitted) {
    error('You have uncommitted changes. Please commit or stash them before continuing.');
  }

  // Detect base branch
  const baseBranch = await git.detectBaseBranch();

  // Update base branch
  await git.checkoutAndPull(baseBranch);

  // Read version from package.json
  const currentVersion = await version.getPackageVersion();

  // Find latest release branch
  const latestBranch = await git.getLatestReleaseBranch();

  // Main menu loop
  while (true) {
    const choice = await ui.showMainMenu(currentVersion, baseBranch, latestBranch);

    switch (choice) {
      case 'new-beta':
        await release.createNewBetaBranch(currentVersion, baseBranch);
        success('Operation completed successfully!');
        return;

      case 'add-beta':
        if (!latestBranch) {
          error('Option not available');
        }
        await release.addBetaToExisting(latestBranch);
        success('Operation completed successfully!');
        return;

      case 'final-release':
        if (!latestBranch) {
          error('Option not available');
        }
        await release.createFinalRelease(latestBranch);
        success('Operation completed successfully!');
        return;

      case 'quit':
        info('Goodbye!');
        process.exit(0);

      default:
        error('Invalid choice');
    }
  }
}
