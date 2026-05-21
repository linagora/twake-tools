/**
 * VersionStatus component - Display latest stable and beta versions with dates
 */

import type { GitHubRelease } from '../../types/github';
import { formatDate, isOlderThan } from '../../utils/dateUtils';

interface VersionStatusProps {
  latestStable: GitHubRelease | null;
  latestBeta: GitHubRelease | null;
}

export function VersionStatus({
  latestStable,
  latestBeta,
}: VersionStatusProps) {
  return (
    <div className="flex items-center gap-4 mb-3">
      {latestStable && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400">
            Latest Stable:
          </span>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
            {latestStable.tag_name}
          </span>
          <span
            className={`text-sm ${
              isOlderThan(
                latestStable.published_at || latestStable.created_at,
                1,
              ) && !latestBeta
                ? 'text-red-400'
                : 'text-gray-500'
            }`}
          >
            {formatDate(latestStable.published_at || latestStable.created_at)}
          </span>
        </div>
      )}
      {latestBeta && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400">
            Latest Beta:
          </span>
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold">
            {latestBeta.tag_name}
          </span>
          <span
            className={`text-sm ${
              isOlderThan(
                latestBeta.published_at || latestBeta.created_at,
                1 / 4.3,
              ) // ~1 week
                ? 'text-red-400'
                : 'text-gray-500'
            }`}
          >
            {formatDate(latestBeta.published_at || latestBeta.created_at)}
          </span>
        </div>
      )}
    </div>
  );
}
