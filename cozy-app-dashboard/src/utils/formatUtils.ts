/**
 * Formatting utility functions for numbers, durations, and other display values
 */

/**
 * Formats a number with compact notation (K, M, B)
 * @example formatNumber(1500) => '1.5K'
 * @example formatNumber(2500000) => '2.5M'
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Formats a duration in seconds to a human-readable string
 * @example formatDuration(125) => '2m 5s'
 * @example formatDuration(3665) => '1h 1m 5s'
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Formats a percentage with specified decimal places
 * @example formatPercentage(0.8567, 1) => '85.7%'
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a file size in bytes to human-readable format
 * @example formatFileSize(1024) => '1 KB'
 * @example formatFileSize(1536000) => '1.5 MB'
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
