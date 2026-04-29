import simpleGit from 'simple-git';
import { error } from './config.js';

const git = simpleGit();

export async function isGitRepository() {
  try {
    await git.revparse(['--git-dir']);
    return true;
  } catch {
    return false;
  }
}

export async function hasUncommittedChanges() {
  const status = await git.status();
  return status.files.length > 0;
}

export async function detectBaseBranch() {
  const branches = await git.branch(['-a']);

  if (branches.all.some(b => b === 'main' || b === 'remotes/origin/main')) {
    return 'main';
  }
  if (branches.all.some(b => b === 'master' || b === 'remotes/origin/master')) {
    return 'master';
  }

  error("No 'main' or 'master' branch found");
}

export async function checkoutAndPull(branch) {
  await git.checkout(branch);
  await git.pull('origin', branch);
}

export async function getLatestReleaseBranch() {
  const branches = await git.branch(['-r']);
  const releaseBranches = branches.all
    .filter(b => b.includes('origin/release/'))
    .map(b => b.replace('origin/', '').trim())
    .sort((a, b) => {
      const versionA = a.replace('release/', '');
      const versionB = b.replace('release/', '');
      return versionA.localeCompare(versionB, undefined, { numeric: true });
    });

  return releaseBranches.length > 0 ? releaseBranches[releaseBranches.length - 1] : null;
}

export function getVersionFromBranch(branch) {
  return branch.replace('release/', '');
}

export async function getLatestBeta(baseVersion) {
  const tags = await git.tags(['-l', `${baseVersion}-beta.*`]);

  if (!tags || tags.all.length === 0) {
    return null;
  }

  const sortedTags = tags.all.sort((a, b) => {
    const numA = parseInt(a.match(/beta\.(\d+)$/)?.[1] || 0);
    const numB = parseInt(b.match(/beta\.(\d+)$/)?.[1] || 0);
    return numA - numB;
  });

  return sortedTags[sortedTags.length - 1];
}

export async function tagExists(tag) {
  try {
    await git.revparse([tag]);
    return true;
  } catch {
    return false;
  }
}

export async function createAndPushTag(tagName, branch) {
  const exists = await tagExists(tagName);
  if (exists) {
    error(`Tag ${tagName} already exists`);
  }

  await git.tag([tagName, branch]);
  await git.push(['origin', tagName]);
}

export async function createBranch(branchName, fromBranch) {
  await git.checkoutBranch(branchName, fromBranch);
  await git.push(['-u', 'origin', branchName]);
}

export async function branchExists(branchName) {
  const branches = await git.branch(['-a']);
  return branches.all.some(b =>
    b === branchName ||
    b === `remotes/origin/${branchName}`
  );
}

export async function fetchTags() {
  await git.fetch(['--tags', 'origin']);
}
