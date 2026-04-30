const shell = require('shelljs');
const { checkGitHubTools } = require('./config.js');

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

module.exports = {
  createPullRequest
};
