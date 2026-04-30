const { input, confirm, checkbox } = require('@inquirer/prompts');
const semver = require('semver');
const fs = require('fs');

async function selectApps() {
  // Get available directories in current folder
  const items = fs.readdirSync('.', { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'node_modules' && !dirent.name.startsWith('.'))
    .map(dirent => dirent.name);

  if (items.length === 0) {
    console.log('⚠️ No directories found in current folder.');
    return [];
  }

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

async function askLibName() {
  return await input({
    message: 'Which package do you want to update in apps/libs?',
    validate: (value) => value.trim() !== '' || 'Please enter a library name'
  });
}

async function askTargetVersion(libName) {
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
  return targetVersion;
}

async function askShouldCommit() {
  return await confirm({
    message: 'Do you want to create commits?',
    default: true
  });
}

async function askShouldPushBranch() {
  return await confirm({
    message: 'Do you want to push the branch to remote?',
    default: true
  });
}

async function askShouldCreatePR() {
  return await confirm({
    message: 'Do you want to create a Pull Request after pushing?',
    default: true
  });
}

async function askIsDryRun() {
  return await confirm({
    message: 'Is this a dry run? (will log actions but not execute them)',
    default: false
  });
}

module.exports = {
  selectApps,
  askLibName,
  askTargetVersion,
  askShouldCommit,
  askShouldPushBranch,
  askShouldCreatePR,
  askIsDryRun
};
