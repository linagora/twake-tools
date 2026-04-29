#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const cacheDir = join(rootDir, '.tools-cache');

const tool = process.argv[2];

if (!tool) {
  console.error('Usage: npx github:linagora/twake-tools <tool-name>');
  console.error('');
  console.error('Available tools:');
  console.error('  cozy-app-release');
  process.exit(1);
}

const toolPath = join(rootDir, tool);

// Vérifie si le tool existe
if (!existsSync(toolPath)) {
  console.error(`Error: Tool "${tool}" not found`);
  process.exit(1);
}

// Lit la version actuelle du tool
const toolPackagePath = join(toolPath, 'package.json');
const toolPackage = JSON.parse(readFileSync(toolPackagePath, 'utf8'));
const currentVersion = toolPackage.version;

// Vérifie le cache
const cacheFile = join(cacheDir, `${tool}.json`);
let needsInstall = true;

if (existsSync(cacheFile)) {
  const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
  if (cache.version === currentVersion && existsSync(join(toolPath, 'node_modules'))) {
    needsInstall = false;
  }
}

// Installe si nécessaire
if (needsInstall) {
  console.log(`Installing dependencies for ${tool} v${currentVersion}...`);
  console.log('(This may take 30-60 seconds)');
  
  try {
    execSync('npm install', {
      cwd: toolPath,
      stdio: 'inherit',
      timeout: 120000
    });
    
    // Met à jour le cache
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

// Exécute le tool
const binPath = join(toolPath, 'bin', `${tool}.js`);
try {
  execSync(`node ${binPath}`, {
    stdio: 'inherit'
  });
} catch (e) {
  process.exit(e.status || 1);
}
