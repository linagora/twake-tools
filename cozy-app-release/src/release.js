import * as git from './git.js';
import * as version from './version.js';
import * as github from './github.js';
import * as ui from './ui.js';
import { info, success, warning, error } from './config.js';
import simpleGit from 'simple-git';

const gitClient = simpleGit();

export async function createNewBetaBranch(currentVersion, baseBranch, releaseNotes = null, options = {}) {
  const releaseBranch = `release/${currentVersion}`;
  const tag = `${currentVersion}-beta.1`;

  info(`Creating branch ${releaseBranch} from ${baseBranch}...`);

  const exists = await git.branchExists(releaseBranch);
  if (exists) {
    error(`Branch ${releaseBranch} already exists`);
  }

  const nextVersion = await ui.getNextDevelopmentVersion(currentVersion, baseBranch, options.nextVersion);

  await git.createBranch(releaseBranch, baseBranch);
  success(`Branch ${releaseBranch} created and pushed`);

  await git.createAndPushTag(tag, releaseBranch);
  await github.createGitHubRelease(tag, true, releaseNotes);
  if (nextVersion !== null) {
    await bumpVersionOnMaster({ oldVersion: currentVersion, baseBranch, newVersion: nextVersion });
  }
  await github.openReleasesPage();
}

export async function addBetaToExisting(latestBranch, releaseNotes = null, options = {}) {
  const baseVersion = git.getVersionFromBranch(latestBranch);

  info(`Searching for existing betas for ${baseVersion}...`);

  await git.fetchTags();
  const latestBeta = await git.getLatestBeta(baseVersion);

  let nextBeta;
  if (!latestBeta) {
    nextBeta = `${baseVersion}-beta.1`;
    info(`No beta found. Proposing: ${nextBeta}`);
  } else {
    nextBeta = version.incrementBeta(latestBeta);
    info(`Latest beta found: ${latestBeta}`);
    info(`Proposing: ${nextBeta}`);
  }

  const confirmed = await ui.confirmCreation(nextBeta, options.yes);
  if (!confirmed) {
    info('Operation cancelled');
    return;
  }

  await gitClient.checkout(latestBranch);
  await git.createAndPushTag(nextBeta, latestBranch);
  await github.createGitHubRelease(nextBeta, true, releaseNotes);
  await github.openReleasesPage();
}

export async function createFinalRelease(latestBranch, releaseNotes = null, options = {}) {
  const releaseVersion = git.getVersionFromBranch(latestBranch);

  info(`Creating final release ${releaseVersion} on ${latestBranch}...`);

  const exists = await git.tagExists(releaseVersion);
  if (exists) {
    error(`Tag ${releaseVersion} already exists`);
  }

  const confirmed = await ui.confirmFinalRelease(releaseVersion, options.yes);
  if (!confirmed) {
    info('Operation cancelled');
    return;
  }

  await gitClient.checkout(latestBranch);
  await git.createAndPushTag(releaseVersion, latestBranch);
  await github.createGitHubRelease(releaseVersion, false, releaseNotes);
  await github.openReleasesPage();
}

export const bumpVersionOnMaster = async ({ oldVersion, baseBranch, newVersion }) => {
  info(`Bumping version on ${baseBranch} to ${newVersion}...`);

  await gitClient.checkout(baseBranch);
  const updatedFiles = await version.updateVersionInFiles(oldVersion, newVersion);
  await gitClient.add(updatedFiles);
  await gitClient.commit(`chore: Bump to ${newVersion}`);

  try {
    await gitClient.push(['origin', baseBranch]);
    success(`Version bumped to ${newVersion} on ${baseBranch}`);
  } catch {
    warning(`${baseBranch} refused the push, opening a pull request instead...`);
    await openVersionBumpPullRequest({ oldVersion, baseBranch, newVersion });
  }
};

const openVersionBumpPullRequest = async ({ oldVersion, baseBranch, newVersion }) => {
  const bumpBranch = `chore/bump-${newVersion}`;

  await gitClient.checkoutLocalBranch(bumpBranch);
  await gitClient.branch(['-f', baseBranch, `origin/${baseBranch}`]);
  await gitClient.push(['-u', 'origin', bumpBranch]);
  await github.createPullRequest({
    baseBranch,
    headBranch: bumpBranch,
    title: `chore: Bump to ${newVersion}`,
    body: `Bump the development version to ${newVersion} after the ${oldVersion} beta.`
  });
  await gitClient.checkout(baseBranch);
};
