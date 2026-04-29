import { promises as fs } from 'fs';
import { error } from './config.js';

export async function getPackageVersion() {
  try {
    const content = await fs.readFile('package.json', 'utf8');
    const pkg = JSON.parse(content);

    if (!pkg.version || !/^\d+\.\d+\.\d+$/.test(pkg.version)) {
      error('Unable to read valid version from package.json');
    }

    return pkg.version;
  } catch {
    error('package.json not found or invalid');
  }
}

export function incrementMinorVersion(version) {
  const [major, minor] = version.split('.');
  return `${major}.${parseInt(minor) + 1}.0`;
}

export function incrementBeta(latestBeta) {
  const match = latestBeta.match(/^(.*)-beta\.(\d+)$/);
  if (!match) {
    return null;
  }

  const [, baseVersion, betaNum] = match;
  return `${baseVersion}-beta.${parseInt(betaNum) + 1}`;
}

export async function updateVersionInFiles(oldVersion, newVersion) {
  const files = ['package.json', 'manifest.webapp'];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const updated = content.replace(
        new RegExp(`"version":\\s*"${oldVersion}"`, 'g'),
        `"version": "${newVersion}"`
      );
      await fs.writeFile(file, updated);
    } catch {
      // File doesn't exist, skip
    }
  }
}
