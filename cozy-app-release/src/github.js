import { execa } from 'execa';
import { error, warning, info, success } from './config.js';

export async function checkGhCli() {
  try {
    await execa('gh', ['--version'], {
      stdin: 'ignore',
      timeout: 5000
    });
    return true;
  } catch {
    return false;
  }
}

export async function checkGhAuth() {
  try {
    // Use --hostname to avoid keychain prompts on macOS
    await execa('gh', ['auth', 'status', '--hostname', 'github.com'], {
      stdin: 'ignore',
      timeout: 10000
    });
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
    await execa('gh', args, {
      stdin: 'ignore',
      timeout: 60000
    });
    success(`GitHub release created: ${tag}`);
  } catch (e) {
    error(`Unable to create GitHub release: ${e.message}`);
  }
}

export async function openReleasesPage() {
  info('Opening GitHub releases page...');
  try {
    await execa('gh', ['browse', '--releases'], {
      stdin: 'ignore',
      timeout: 10000
    });
  } catch {
    warning('Unable to open browser');
  }
}
