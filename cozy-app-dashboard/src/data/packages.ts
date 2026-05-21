import type { PackageData } from '../types/github';
import { getCachedData } from './cache';

const DATA_BASE_URL = import.meta.env.BASE_URL || '/';

export async function getPackages(): Promise<PackageData[]> {
  return getCachedData('packages', async () => {
    try {
      const response = await fetch(`${DATA_BASE_URL}data/cache/packages.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.status}`);
      }
      return (await response.json()) as PackageData[];
    } catch (error) {
      console.error('Error reading cached packages data:', error);
      return [];
    }
  });
}
