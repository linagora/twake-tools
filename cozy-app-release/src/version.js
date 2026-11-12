import { promises as fs } from 'fs';
import semver from 'semver';
import simpleGit from 'simple-git';

import { error } from './config.js';

const VERSION_FILE_PATHSPECS = [':(glob)**/package.json', ':(glob)**/manifest.webapp'];

export const fetchAppVersion = async () => {
  try {
    const content = await fs.readFile('manifest.webapp', 'utf8');
    const manifest = JSON.parse(content);

    if (!semver.valid(manifest.version) || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      error('Unable to read valid version from manifest.webapp');
    }

    return manifest.version;
  } catch {
    error('manifest.webapp not found or invalid');
  }
};

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

export const updateVersionInFiles = async (oldVersion, newVersion) => {
  const listing = await simpleGit().raw(['ls-files', '--', ...VERSION_FILE_PATHSPECS]);
  const files = listing.split('\n').filter(file => file !== '');
  const updatedFiles = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const updated = content.replace(
      new RegExp(`"version":\\s*"${oldVersion}"`, 'g'),
      `"version": "${newVersion}"`
    );
    if (updated !== content) {
      await fs.writeFile(file, updated);
      updatedFiles.push(file);
    }
  }

  return updatedFiles;
};
