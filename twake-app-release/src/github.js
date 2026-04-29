import { execa } from 'execa';
import { error, warning, info, success } from './config.js';

export async function checkGhCli() {
  try {
    await execa('gh', ['--version']);
    return true;
  } catch {
    return false;
  }
}

export async function checkGhAuth() {
  try {
    await execa('gh', ['auth', 'status']);
    return true;
  } catch {
    return false;
  }
}

export async function createGitHubRelease(tag, isPrerelease = false) {
  info(`Creating GitHub release for ${tag}...`);

  const args = [
    'release', 'create', tag,
    '--title', tag,
    '--generate-notes'
  ];

  if (isPrerelease) {
    args.push('--prerelease');
  }

  try {
    await execa('gh', args);
    success(`GitHub release created: ${tag}`);
  } catch (e) {
    error(`Unable to create GitHub release: ${e.message}`);
  }
}

export async function openReleasesPage() {
  info('Opening GitHub releases page...');
  try {
    await execa('gh', ['browse', '--releases']);
  } catch {
    warning('Unable to open browser');
  }
}
