import type { CacheProviders } from '@/lib/resources';
import { getApi } from '@/lib/resources/api';
import { enableCacheLogging, STORE_OBJECT_TTL } from '@/lib/resources/constants';
import type { ColorsDTO } from 'guildwars2-ts';
import { z } from 'zod';

export type Color = z.infer<typeof ColorsDTO>[number];

function getColorFromApi(): Promise<Color[]> {
  return getApi().colors.get('all');
}

export async function getColor(id: number | number[] | 'all', cacheProviders: CacheProviders): Promise<Color[]> {
  const { objectStore } = cacheProviders;
  const OBJECT_KEY = 'colors.json';

  let allItems: Color[] | null = null;
  const object = await objectStore.get(OBJECT_KEY);

  if (object !== null) {
    if (enableCacheLogging) console.log(`object HIT for ${OBJECT_KEY}`);
    allItems = await object.json<Color[]>();
  } else {
    if (enableCacheLogging) console.log(`object MISS for ${OBJECT_KEY}`);
    allItems = await getColorFromApi();
    await objectStore.put(OBJECT_KEY, JSON.stringify(allItems), {
      customMetadata: {
        expiresAt: new Date(Date.now() + STORE_OBJECT_TTL * 1000).toISOString(),
      },
    });
  }

  if (allItems === null) {
    return [];
  }

  const ids = Array.isArray(id) ? id : [id];
  const idSet = new Set(ids);

  return allItems.filter((item) => idSet.has(item.id));
}
