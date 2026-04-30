const { execSync } = require('child_process');

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

module.exports = {
  isCommandAvailable,
  checkGitHubTools
};
