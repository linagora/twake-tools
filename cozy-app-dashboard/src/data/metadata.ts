export interface Metadata {
  lastUpdated: string | null;
}

const DATA_BASE_URL = import.meta.env.BASE_URL || '/';

export async function getMetadata(): Promise<Metadata> {
  try {
    const response = await fetch(`${DATA_BASE_URL}data/cache/metadata.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    return (await response.json()) as Metadata;
  } catch (error) {
    console.error('Error reading metadata:', error);
    return { lastUpdated: null };
  }
}
