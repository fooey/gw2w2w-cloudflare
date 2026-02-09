import type { CacheProviders } from '@/lib/resources';
import { getApi } from '@/lib/resources/api';
import { withFilteredObjectCache } from './cache-wrapper';
import type { ColorsDTO } from 'guildwars2-ts';
import { z } from 'zod';

export type Color = z.infer<typeof ColorsDTO>[number];

function getColorFromApi(): Promise<Color[]> {
  return getApi().colors.get('all');
}

export async function getColor(id: number | number[] | 'all', cacheProviders: CacheProviders): Promise<Color[]> {
  return withFilteredObjectCache('colors.json', id, getColorFromApi, cacheProviders);
}
