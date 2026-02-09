import type { CacheProviders } from '@/lib/resources';
import { getApi } from '@/lib/resources/api';
import { withFilteredObjectCache } from './cache-wrapper';
import type { EmblemDTO } from 'guildwars2-ts';
import { z } from 'zod';

export type Emblem = z.infer<typeof EmblemDTO>[number];

function getEmblemBackgroundFromApi(): Promise<Emblem[]> {
  return getApi().emblem.get('backgrounds', 'all');
}

function getEmblemForegroundFromApi(): Promise<Emblem[]> {
  return getApi().emblem.get('foregrounds', 'all');
}

export async function getEmblemBackground(
  emblemId: number | number[] | 'all',
  cacheProviders: CacheProviders,
): Promise<Emblem[]> {
  return withFilteredObjectCache('backgrounds.json', emblemId, getEmblemBackgroundFromApi, cacheProviders);
}

export async function getEmblemForeground(
  emblemId: number | number[] | 'all',
  cacheProviders: CacheProviders,
): Promise<Emblem[]> {
  return withFilteredObjectCache('foregrounds.json', emblemId, getEmblemForegroundFromApi, cacheProviders);
}
