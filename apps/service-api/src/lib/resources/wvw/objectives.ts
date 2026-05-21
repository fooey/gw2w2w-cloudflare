import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';
import { z } from 'zod';

export const WvWObjectiveSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sector_id: z.number().describe('ID of the map sector this objective belongs to'),
    type: z
      .enum(['Spawn', 'Camp', 'Ruins', 'Tower', 'Keep', 'Castle', 'Mercenary', 'Generic', 'Resource'])
      .describe('Objective structure type'),
    map_type: z
      .enum(['Center', 'RedHome', 'BlueHome', 'GreenHome', 'EdgeOfTheMists'])
      .describe('WvW map this objective appears on'),
    map_id: z.number().describe('Internal GW2 map ID'),
    upgrade_id: z.number().optional().describe('Associated WvW upgrade track ID (if applicable)'),
    coord: z
      .tuple([z.number(), z.number(), z.number()])
      .optional()
      .describe('[x, y, z] world-space coordinates of the objective'),
    label_coord: z.tuple([z.number(), z.number()]).optional().describe('[x, y] map-label placement coordinates'),
    marker: z.string().optional().describe('CDN URL to the objective map marker icon'),
    chat_link: z.string().describe('In-game chat link code'),
  })
  .describe('WvW map objective definition from /v2/wvw/objectives');

export type WvWObjective = z.infer<typeof WvWObjectiveSchema>;

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
