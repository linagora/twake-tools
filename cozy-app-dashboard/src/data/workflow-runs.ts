import type { GitHubWorkflowRun } from '../types/github';
import { getCachedData } from './cache';

const DATA_BASE_URL = import.meta.env.BASE_URL || '/';

export async function getWorkflowRuns(): Promise<GitHubWorkflowRun[]> {
  return getCachedData('workflow-runs', async () => {
    try {
      const response = await fetch(
        `${DATA_BASE_URL}data/cache/workflow-runs.json`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow runs: ${response.status}`);
      }
      return (await response.json()) as GitHubWorkflowRun[];
    } catch (error) {
      console.error('Error reading cached workflow runs data:', error);
      return [];
    }
  });
}
