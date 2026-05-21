/**
 * Date utility functions for formatting and time calculations
 */

/**
 * Formats a date string to a localized date string
 * @example formatDate('2024-01-15T10:30:00Z') => 'Jan 15, 2024'
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date as a relative time string (e.g., "2 days ago")
 * @example formatRelativeTime('2024-01-15T10:30:00Z') => '2 days ago'
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }

  const years = Math.floor(diffInSeconds / 31536000);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

/**
 * Checks if a date is older than a specified number of months
 * @example isOlderThan('2024-01-15T10:30:00Z', 1) => true/false
 */
export function isOlderThan(dateString: string, months: number): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const monthsAgo = new Date(now);
  monthsAgo.setMonth(now.getMonth() - months);
  return date < monthsAgo;
}

/**
 * Gets the month key from a date string in YYYY-MM format
 * @example getMonthKey('2024-01-15T10:30:00Z') => '2024-01'
 */
export function getMonthKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Formats a month key to a human-readable month name
 * @example formatMonthName('2024-01') => 'Jan 2024'
 */
export function formatMonthName(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
