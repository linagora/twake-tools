#!/usr/bin/env node

const { input, confirm } = require('@inquirer/prompts');
const semver = require('semver');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Set shelljs to be verbose by default
shell.config.verbose = true;

// Function to check if a command is available
function isCommandAvailable(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to check for GitHub tools
function checkGitHubTools() {
  const hasGh = isCommandAvailable('gh');
  const hasHub = isCommandAvailable('hub');

  return { hasGh, hasHub };
}

// Function to create PR using available tool
function createPullRequest(libName, targetVersion, branchName) {
  const { hasGh, hasHub } = checkGitHubTools();

  if (!hasGh && !hasHub) {
    console.log('⚠️ Neither gh nor hub found. Cannot create PR automatically.');
    console.log('Install GitHub CLI with: brew install gh');
    return false;
  }

  if (hasHub) {
    console.log('🔄 Creating Pull Request with hub...');
    try {
      // hub pull-request typically needs message and edit flags for non-interactive use
      shell.exec(`hub pull-request --no-edit -m "Update ${libName} to ${targetVersion}" -m "Automated PR created by repo-updater" -o`);
      return true;
    } catch (error) {
      console.error('❌ Failed to create PR with hub:', error.message);
      return false;
    }
  } else if (hasGh) {
    console.log('🔄 Creating Pull Request with GitHub CLI...');
    try {
      shell.exec(`gh pr create --title "Update ${libName} to ${targetVersion}" --body "Automated PR created by repo-updater" --base master --head ${branchName}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to create PR with gh:', error.message);
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Starting Repo Updater');
  console.log('===================================\n');

  // 1. Ask which lib to update
  const libName = await input({
    message: 'Which package do you want to update in apps/libs?',
    validate: (value) => value.trim() !== '' || 'Please enter a library name'
  });

  // 2. Ask to which version to update
  let targetVersion;
  while (true) {
    targetVersion = await input({
      message: `What version of ${libName} do you want to update to?`
    });

    if (semver.valid(targetVersion) || semver.validRange(targetVersion)) {
      break;
    } else {
      console.log('❌ Invalid semver version or range. Please try again.');
    }
  }

  // 3. Ask which apps (folders) to apply the update to
  const selectedApps = await selectApps();
  const apps = Array.isArray(selectedApps) ? selectedApps : [selectedApps];
  if (apps.length === 0) {
    console.log('❌ No apps selected. Exiting.');
    return;
  }

  // 4. Ask if user wants to commit
  const shouldCommit = await confirm({
    message: 'Do you want to create commits?',
    default: true
  });

  // 5. Ask if user wants to push the branch
  const shouldPushBranch = await confirm({
    message: 'Do you want to push the branch to remote?',
    default: true
  });

  // 6. Ask if user wants to create PR
  let shouldCreatePR = false;
  if (shouldPushBranch) {
    shouldCreatePR = await confirm({
      message: 'Do you want to create a Pull Request after pushing?',
      default: true
    });
  }

  // 7. Ask if this is a dry run (verbose only)
  const isDryRun = await confirm({
    message: 'Is this a dry run? (will log actions but not execute them)',
    default: false
  });

  console.log('\n📋 Configuration:');
  console.log(`- Library: ${libName}`);
  console.log(`- Target Version: ${targetVersion}`);
  console.log(`- Apps: ${apps.join(', ')}`);
  console.log(`- Commit: ${shouldCommit ? 'Yes' : 'No'}`);
  console.log(`- Push Branch: ${shouldPushBranch ? 'Yes' : 'No'}`);
  console.log(`- Create PR: ${shouldCreatePR ? 'Yes' : 'No'}`);
  console.log(`- Dry Run: ${isDryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Process each app
  for (const app of apps) {
    console.log(`\n🔧 Processing app: ${app}`);
    await processApp(app, libName, targetVersion, shouldCommit, shouldPushBranch, shouldCreatePR, isDryRun);
  }

  console.log('\n✅ All apps processed successfully!');
}

async function selectApps() {
  // Get available directories in current folder
  const items = fs.readdirSync('.', { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'node_modules' && !dirent.name.startsWith('.'))
    .map(dirent => dirent.name);

  if (items.length === 0) {
    console.log('⚠️ No directories found in current folder.');
    return [];
  }

  // For @inquirer/prompts, we need to use checkbox for multiple selection
  const { checkbox } = require('@inquirer/prompts');

  const result = await checkbox({
    message: 'Select which apps (folders) to update ([SPACE] to select and [ENTER] to validate):',
    choices: items.map(item => ({
      name: item,
      value: item
    })),
    instructions: false
  });

  // Ensure we always return an array
  return Array.isArray(result) ? result : [result];
}

async function processApp(appPath, libName, targetVersion, shouldCommit, shouldPushBranch, shouldCreatePR, isDryRun) {
  const originalDir = process.cwd();
  const safeVersion = targetVersion.replace(/[\^~]/g, '-');
  const safeLibName = libName.replace('@', '').replace('/', '-')
  const branchName = `feat/update-${safeLibName}-${safeVersion}`;

  try {
    // Change to app directory
    if (!isDryRun) {
      process.chdir(appPath);
    }
    console.log(`📁 Changed to directory: ${appPath}`);

    // Checkout to master
    if (isDryRun) {
      console.log(`[DRY RUN] Would checkout to master`);
    } else {
      console.log('🔄 Checking out to master...');
      shell.exec('git checkout master');
    }

    // Run git pull
    if (isDryRun) {
      console.log(`[DRY RUN] Would run git pull`);
    } else {
      console.log('🔄 Pulling latest changes...');
      shell.exec('git pull');
    }

    // Create branch
    if (isDryRun) {
      console.log(`[DRY RUN] Would create branch: ${branchName}`);
    } else {
      console.log(`🔄 Creating branch: ${branchName}`);
      shell.exec(`git checkout -b ${branchName}`);
    }

    // Update dependency using yarn
    if (isDryRun) {
      console.log(`[DRY RUN] Would update ${libName} to version ${targetVersion} using yarn`);
    } else {
      console.log(`🔄 Updating ${libName} to version ${targetVersion}...`);
      shell.exec(`yarn add ${libName}@${targetVersion}`);
    }

    // Create commit if requested
    if (shouldCommit) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would create commit: "feat: Update ${libName} to ${targetVersion}"`);
      } else {
        console.log(`🔄 Creating commit...`);
        shell.exec(`git add .`);
        shell.exec(`git commit -m "feat: Update ${libName} to ${targetVersion}"`);
      }
    }

    // Push branch if requested
    if (shouldPushBranch) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would push branch ${branchName} to remote`);

        if (shouldCreatePR) {
          console.log(`[DRY RUN] Would create PR for branch ${branchName}`);
        }
      } else {
        console.log(`🔄 Pushing branch to remote...`);
        shell.exec(`git push --set-upstream origin ${branchName}`);

        if (shouldCreatePR) {
          createPullRequest(libName, targetVersion, branchName);
        }
      }
    }

    // Checkout to master
    if (isDryRun) {
      console.log(`[DRY RUN] Would checkout to master`);
    } else {
      console.log('🔄 Checking out to master...');
      shell.exec('git checkout master');
    }
  } catch (error) {
    console.error(`❌ Error processing app ${appPath}:`, error.message);
  } finally {
    // Change back to original directory
    if (!isDryRun) {
      process.chdir(originalDir);
    }
    console.log(`📁 Changed back to directory: ${originalDir}`);
  }
}

// Export functions for testing
module.exports = {
  main,
  processApp,
  selectApps,
  checkGitHubTools,
  isCommandAvailable,
  createPullRequest
};
