#!/usr/bin/env node

import { execSync, spawnSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Persistent cache in home directory
const homeDir = os.homedir();
const toolsCacheDir = join(homeDir, '.twake-tools-cache');

const tool = process.argv[2];
const toolArgs = process.argv.slice(3);

// A tool is any top-level directory exposing bin/<dir-name>.js
function availableTools() {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .filter((entry) => existsSync(join(rootDir, entry.name, 'bin', `${entry.name}.js`)))
    .map((entry) => entry.name);
}

if (!tool) {
  console.error('Usage: npx github:linagora/twake-tools <tool-name> [tool-args...]');
  console.error('');
  console.error('Available tools:');
  for (const name of availableTools()) {
    console.error(`  ${name}`);
  }
  console.error('');
  console.error('Or install globally:');
  console.error('  npm install -g github:linagora/twake-tools');
  console.error('  twake-tools <tool-name> [tool-args...]');
  process.exit(1);
}

// Check if we're in a temporary npx clone or global installation
const isTemporaryNpx = rootDir.includes('npm/_cacache') || rootDir.includes('npm/_npx');

let toolPath;
let cacheDir;

if (isTemporaryNpx) {
  // npx mode: use persistent cache
  toolPath = join(toolsCacheDir, tool);
  cacheDir = join(toolsCacheDir, '.cache');

  // Check if tool is already in cache
  if (!existsSync(toolPath)) {
    console.log(`First run: Setting up ${tool} in cache...`);
    mkdirSync(toolPath, { recursive: true });

    // Copy tool files from temporary repo
    const sourcePath = join(rootDir, tool);
    if (existsSync(sourcePath)) {
      cpSync(sourcePath, toolPath, { recursive: true });
    } else {
      console.error(`Error: Tool "${tool}" not found in repository`);
      process.exit(1);
    }
  }
} else {
  // Global or dev mode: use directory directly
  toolPath = join(rootDir, tool);
  cacheDir = join(rootDir, '.tools-cache');
}

// Check that tool exists
if (!existsSync(toolPath)) {
  console.error(`Error: Tool "${tool}" not found`);
  process.exit(1);
}

// Read current tool version
const toolPackagePath = join(toolPath, 'package.json');
if (!existsSync(toolPackagePath)) {
  console.error(`Error: Tool "${tool}" is missing package.json`);
  process.exit(1);
}

const toolPackage = JSON.parse(readFileSync(toolPackagePath, 'utf8'));
const currentVersion = toolPackage.version;

// Check cache
const cacheFile = join(cacheDir, `${tool}.json`);
const hasDependencies =
  Object.keys(toolPackage.dependencies || {}).length > 0 ||
  Object.keys(toolPackage.devDependencies || {}).length > 0;
let needsInstall = hasDependencies;

if (hasDependencies && existsSync(cacheFile)) {
  try {
    const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
    if (cache.version === currentVersion && existsSync(join(toolPath, 'node_modules'))) {
      needsInstall = false;
    }
  } catch {
    // Corrupted cache, reinstall
  }
}

// Install if necessary
if (needsInstall) {
  console.log(`Installing dependencies for ${tool} v${currentVersion}...`);
  console.log('(This may take 30-60 seconds)');

  try {
    execSync('npm install', {
      cwd: toolPath,
      stdio: 'inherit',
      timeout: 120000
    });

    // Update cache
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify({
      version: currentVersion,
      installedAt: new Date().toISOString()
    }));

    console.log('✅ Dependencies installed');
  } catch (e) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

// Execute tool
const binPath = join(toolPath, 'bin', `${tool}.js`);
if (!existsSync(binPath)) {
  console.error(`Error: Tool "${tool}" is missing executable`);
  process.exit(1);
}

// Arguments are forwarded as-is, so tools taking parameters can be run as a
// one-liner: npx github:linagora/twake-tools <tool-name> <arg> <arg>...
const { status, error } = spawnSync(process.execPath, [binPath, ...toolArgs], {
  cwd: process.cwd(), // Important: execute in current working directory
  stdio: 'inherit'
});

if (error) {
  console.error(`Error: failed to run "${tool}" - ${error.message}`);
  process.exit(1);
}

process.exit(status ?? 1);
