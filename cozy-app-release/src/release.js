import * as git from './git.js';
import * as version from './version.js';
import * as github from './github.js';
import * as ui from './ui.js';
import { info, success, error } from './config.js';
import simpleGit from 'simple-git';

const gitClient = simpleGit();

export async function createNewBetaBranch(currentVersion, baseBranch) {
  const releaseBranch = `release/${currentVersion}`;
  const tag = `${currentVersion}-beta.1`;

  info(`Creating branch ${releaseBranch} from ${baseBranch}...`);

  const exists = await git.branchExists(releaseBranch);
  if (exists) {
    error(`Branch ${releaseBranch} already exists`);
  }

  await git.createBranch(releaseBranch, baseBranch);
  success(`Branch ${releaseBranch} created and pushed`);

  await git.createAndPushTag(tag, releaseBranch);
  await github.createGitHubRelease(tag, true);
  await bumpVersionOnMaster(currentVersion, baseBranch);
  await github.openReleasesPage();
}

export async function addBetaToExisting(latestBranch) {
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

  const confirmed = await ui.confirmCreation(nextBeta);
  if (!confirmed) {
    info('Operation cancelled');
    return;
  }

  await gitClient.checkout(latestBranch);
  await git.createAndPushTag(nextBeta, latestBranch);
  await github.createGitHubRelease(nextBeta, true);
  await github.openReleasesPage();
}

export async function createFinalRelease(latestBranch) {
  const releaseVersion = git.getVersionFromBranch(latestBranch);

  info(`Creating final release ${releaseVersion} on ${latestBranch}...`);

  const exists = await git.tagExists(releaseVersion);
  if (exists) {
    error(`Tag ${releaseVersion} already exists`);
  }

  const confirmed = await ui.confirmFinalRelease(releaseVersion);
  if (!confirmed) {
    info('Operation cancelled');
    return;
  }

  await gitClient.checkout(latestBranch);
  await git.createAndPushTag(releaseVersion, latestBranch);
  await github.createGitHubRelease(releaseVersion, false);
  await github.openReleasesPage();
}

export async function bumpVersionOnMaster(oldVersion, baseBranch) {
  const newVersion = version.incrementMinorVersion(oldVersion);

  info(`Bumping version on ${baseBranch} to ${newVersion}...`);

  await gitClient.checkout(baseBranch);
  await version.updateVersionInFiles(oldVersion, newVersion);

  await gitClient.add(['package.json', 'manifest.webapp']);
  await gitClient.commit(`chore: Bump to ${newVersion}`);
  await gitClient.push(['origin', baseBranch, '--force-with-lease']);

  success(`Version bumped to ${newVersion} on ${baseBranch}`);
}
