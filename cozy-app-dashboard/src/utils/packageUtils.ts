/**
 * Package version utilities
 */

/**
 * Cleans version string by removing prefixes like ^, ~, >=, >, =, v
 */
export function cleanVersion(version: string): string {
  return version.replace(/^[\^~>=v]+/, '').trim();
}

/**
 * Compares if a version is greater than or equal to a target version
 * @param version - The version to check
 * @param target - The target version to compare against
 * @returns true if version >= target
 */
export function isVersionGreaterOrEqual(
  version: string,
  target: string,
): boolean {
  const cleanVersionStr = cleanVersion(version);
  const cleanTargetStr = cleanVersion(target);

  const versionParts = cleanVersionStr.split('.').map(Number);
  const targetParts = cleanTargetStr.split('.').map(Number);

  for (let i = 0; i < Math.max(versionParts.length, targetParts.length); i++) {
    const v = versionParts[i] || 0;
    const t = targetParts[i] || 0;

    if (v > t) return true;
    if (v < t) return false;
  }

  return true; // Equal
}

/**
 * Determines the color class for a package version based on target
 */
export function getVersionColorClass(
  version: string,
  targetVersion?: string,
): string {
  if (version === '-') return 'text-gray-500';
  if (!targetVersion) return 'text-cyan-400';

  return isVersionGreaterOrEqual(version, targetVersion)
    ? 'text-green-400'
    : 'text-red-400';
}
