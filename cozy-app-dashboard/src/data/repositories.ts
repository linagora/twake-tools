import type { GitHubRepository } from '../types/github';
import { getCachedData } from './cache';

const DATA_BASE_URL = import.meta.env.BASE_URL || '/';

export async function getRepositories(): Promise<GitHubRepository[]> {
  return getCachedData('repositories', async () => {
    try {
      const response = await fetch(
        `${DATA_BASE_URL}data/cache/repositories.json`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`);
      }
      return (await response.json()) as GitHubRepository[];
    } catch (error) {
      console.error('Error reading cached repository data:', error);
      return [];
    }
  });
}
