import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';

export async function showMainMenu(version, baseBranch, latestBranch) {
  console.log('');
  console.log('========================================');
  console.log('   Release Creation');
  console.log('========================================');
  console.log('');
  console.log(`Current version (package.json): ${chalk.green(version)}`);
  console.log(`Base branch: ${chalk.green(baseBranch)} (up to date)`);
  console.log('');

  if (latestBranch) {
    console.log(`Latest existing release branch: ${chalk.yellow(latestBranch)}`);
  } else {
    console.log(chalk.yellow('No existing release branch'));
  }

  console.log('');
  console.log('What would you like to create?');
  console.log('');

  const choices = [
    {
      name: `New beta ${version}-beta.1 (will create branch release/${version})`,
      value: 'new-beta'
    }
  ];

  if (latestBranch) {
    const existingVersion = latestBranch.replace('release/', '');
    choices.push(
      {
        name: `--- Actions on ${latestBranch} ---`,
        value: 'separator',
        disabled: true
      },
      {
        name: `Add a beta to ${latestBranch}`,
        value: 'add-beta'
      },
      {
        name: `Create final release ${existingVersion} on ${latestBranch}`,
        value: 'final-release'
      }
    );
  }

  choices.push({
    name: 'Quit',
    value: 'quit'
  });

  const choice = await select({
    message: 'Your choice:',
    choices
  });

  return choice;
}

export async function confirmCreation(tag) {
  return await confirm({
    message: `Confirm creation of tag ${tag}?`,
    default: true
  });
}

export async function confirmFinalRelease(version) {
  return await confirm({
    message: `Confirm creation of final release ${version}?`,
    default: true
  });
}
