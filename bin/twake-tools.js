#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Cache persistant dans le home directory
const homeDir = os.homedir();
const toolsCacheDir = join(homeDir, '.twake-tools-cache');

const tool = process.argv[2];

if (!tool) {
  console.error('Usage: npx github:linagora/twake-tools <tool-name>');
  console.error('');
  console.error('Available tools:');
  console.error('  cozy-app-release');
  console.error('');
  console.error('Or install globally:');
  console.error('  npm install -g github:linagora/twake-tools');
  console.error('  twake-tools cozy-app-release');
  process.exit(1);
}

// Vérifie si on est dans un clone temporaire npx ou une installation globale
const isTemporaryNpx = rootDir.includes('npm/_cacache') || rootDir.includes('npm/_npx');

let toolPath;
let cacheDir;

if (isTemporaryNpx) {
  // Mode npx : utilise le cache persistant
  toolPath = join(toolsCacheDir, tool);
  cacheDir = join(toolsCacheDir, '.cache');
  
  // Vérifie si le tool est déjà dans le cache
  if (!existsSync(toolPath)) {
    console.log(`First run: Setting up ${tool} in cache...`);
    mkdirSync(toolPath, { recursive: true });
    
    // Copie les fichiers du tool depuis le repo temporaire
    const sourcePath = join(rootDir, tool);
    if (existsSync(sourcePath)) {
      cpSync(sourcePath, toolPath, { recursive: true });
    } else {
      console.error(`Error: Tool "${tool}" not found in repository`);
      process.exit(1);
    }
  }
} else {
  // Mode installation globale ou dev : utilise le répertoire directement
  toolPath = join(rootDir, tool);
  cacheDir = join(rootDir, '.tools-cache');
}

// Vérifie que le tool existe
if (!existsSync(toolPath)) {
  console.error(`Error: Tool "${tool}" not found`);
  process.exit(1);
}

// Lit la version actuelle du tool
const toolPackagePath = join(toolPath, 'package.json');
if (!existsSync(toolPackagePath)) {
  console.error(`Error: Tool "${tool}" is missing package.json`);
  process.exit(1);
}

const toolPackage = JSON.parse(readFileSync(toolPackagePath, 'utf8'));
const currentVersion = toolPackage.version;

// Vérifie le cache
const cacheFile = join(cacheDir, `${tool}.json`);
let needsInstall = true;

if (existsSync(cacheFile)) {
  try {
    const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
    if (cache.version === currentVersion && existsSync(join(toolPath, 'node_modules'))) {
      needsInstall = false;
    }
  } catch {
    // Cache corrompu, on réinstalle
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
if (!existsSync(binPath)) {
  console.error(`Error: Tool "${tool}" is missing executable`);
  process.exit(1);
}

try {
  execSync(`node ${binPath}`, {
    cwd: process.cwd(), // Important: exécute dans le répertoire de travail actuel
    stdio: 'inherit'
  });
} catch (e) {
  process.exit(e.status || 1);
}
