import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

export interface WvWObjective {
  id: string;
  name: string;
  sector_id: number;
  type: 'Spawn' | 'Camp' | 'Ruins' | 'Tower' | 'Keep' | 'Castle' | 'Mercenary' | 'Generic';
  map_type: string;
  map_id: number;
  upgrade_id?: number;
  coord?: [number, number, number];
  label_coord?: [number, number];
  marker?: string;
  chat_link: string;
}

function getWvWObjectivesFromApi(env: CloudflareEnv): Promise<WvWObjective[] | null> {
  return apiFetch(env, '/wvw/objectives?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
}

export async function getWvWObjective(id: string | string[], env: CloudflareEnv): Promise<WvWObjective[]> {
  return withFilteredObjectCache(
    'wvw-objectives.json',
    id,
    () => getWvWObjectivesFromApi(env),
    createCacheProviders(env),
  );
}
