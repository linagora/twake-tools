#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'update-app-bender.sh');

const { status, error } = spawnSync('bash', [scriptPath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    // Name shown in the script's usage message, instead of its cached path.
    BENDER_USAGE_NAME: 'npx github:linagora/twake-tools cozy-app-bender-updater',
  },
});

if (error) {
  console.error(`Failed to run update-app-bender.sh: ${error.message}`);
  process.exit(1);
}

process.exit(status ?? 1);
