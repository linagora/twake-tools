/**
 * Data transformation utilities for grouping data by repository
 */

import type { GitHubRepository } from '../../types/github';

/**
 * Groups items by repository full name
 * @param repositories - List of repositories
 * @param items - Items to group (must have repo_full_name property)
 * @param filterFn - Optional filter function to apply before grouping
 * @param sortFn - Optional sort function to apply to grouped items
 */
export function groupByRepository<T extends { repo_full_name: string }>(
  repositories: GitHubRepository[],
  items: T[],
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number,
): Record<string, T[]> {
  return repositories.reduce(
    (acc, repo) => {
      let repoItems = items.filter(
        (item) => item.repo_full_name === repo.full_name,
      );

      if (filterFn) {
        repoItems = repoItems.filter(filterFn);
      }

      if (sortFn) {
        repoItems.sort(sortFn);
      }

      acc[repo.full_name] = repoItems;
      return acc;
    },
    {} as Record<string, T[]>,
  );
}
