/**
 * Version parsing and comparison utilities
 */

import type { GitHubRelease } from '../types/github';

/**
 * Parses a semantic version string into its numeric components
 * @example parseVersion('1.49.0-beta.1') => [1, 49, 0]
 */
export function parseVersion(version: string): number[] {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Compares two semantic versions
 * @returns positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }

  return 0;
}

/**
 * Gets the latest stable release from a list of releases
 */
export function getLatestStableRelease(
  releases: GitHubRelease[],
): GitHubRelease | null {
  return releases.find((r) => !r.prerelease) || null;
}

/**
 * Gets the latest stable version string
 */
export function getLatestStableVersion(
  releases: GitHubRelease[],
): string | null {
  const stableRelease = getLatestStableRelease(releases);
  return stableRelease?.tag_name || null;
}

/**
 * Gets the latest beta release that hasn't been superseded by a stable release
 * A beta is considered superseded if its base version is <= the latest stable version
 */
export function getLatestBetaRelease(
  releases: GitHubRelease[],
): GitHubRelease | null {
  const latestBeta = releases.find((r) => r.prerelease);
  if (!latestBeta) return null;

  const stableVersion = getLatestStableVersion(releases);
  if (!stableVersion) return latestBeta;

  // Extract base version from beta (e.g., "1.49.0-beta.1" -> "1.49.0")
  const betaVersion = latestBeta.tag_name;
  const betaMatch = betaVersion.match(/^v?(\d+\.\d+\.\d+)/);
  const stableMatch = stableVersion.match(/^v?(\d+\.\d+\.\d+)/);

  if (!betaMatch || !stableMatch) return latestBeta;

  const betaBase = betaMatch[1];
  const stableBase = stableMatch[1];

  // Compare base versions
  const comparison = compareVersions(betaBase, stableBase);

  // If beta base version > stable, beta is still relevant
  if (comparison > 0) return latestBeta;

  // Otherwise beta is superseded by stable
  return null;
}

/**
 * Gets the latest beta version string (only if not superseded)
 */
export function getLatestBetaVersion(releases: GitHubRelease[]): string | null {
  const betaRelease = getLatestBetaRelease(releases);
  return betaRelease?.tag_name || null;
}

/**
 * Sorts releases by published date (newest first)
 */
export function sortReleasesByDate(releases: GitHubRelease[]): GitHubRelease[] {
  return [...releases].sort(
    (a, b) =>
      new Date(b.published_at || b.created_at).getTime() -
      new Date(a.published_at || a.created_at).getTime(),
  );
}
