#!/usr/bin/env node

const {
  selectApps,
  askLibName,
  askTargetVersion,
  askShouldCommit,
  askShouldPushBranch,
  askShouldCreatePR,
  askIsDryRun
} = require('./ui.js');
const { processApp } = require('./app-processor.js');

async function main() {
  console.log('🚀 Starting Repo Updater');
  console.log('===================================\n');

  // 1. Ask which lib to update
  const libName = await askLibName();

  // 2. Ask to which version to update
  const targetVersion = await askTargetVersion(libName);

  // 3. Ask which apps (folders) to apply the update to
  const selectedApps = await selectApps();
  const apps = Array.isArray(selectedApps) ? selectedApps : [selectedApps];
  if (apps.length === 0) {
    console.log('❌ No apps selected. Exiting.');
    return;
  }

  // 4. Ask if user wants to commit
  const shouldCommit = await askShouldCommit();

  // 5. Ask if user wants to push the branch
  const shouldPushBranch = await askShouldPushBranch();

  // 6. Ask if user wants to create PR
  let shouldCreatePR = false;
  if (shouldPushBranch) {
    shouldCreatePR = await askShouldCreatePR();
  }

  // 7. Ask if this is a dry run (verbose only)
  const isDryRun = await askIsDryRun();

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

// Export functions for testing
module.exports = {
  main
};
