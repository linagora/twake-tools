const shell = require('shelljs');
const { createPullRequest } = require('./github.js');

// Set shelljs to be verbose by default
shell.config.verbose = true;

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

module.exports = {
  processApp
};
