import { renderEmblem } from '@repo/emblem-renderer/index';
import type { ServiceApiAppType } from '@repo/service-api';
import type { createCacheProviders } from '@repo/service-api/lib/cache-providers';
import { getTextureArrayBuffer } from '@repo/service-api/lib/resources';
import { type Color, type Emblem, type Guild } from '@repo/service-api/lib/types';
import { type Context } from 'hono';
import { DetailedError, hc, parseResponse } from 'hono/client';

export type ApiClient = ReturnType<typeof hc<ServiceApiAppType>>;

export function getApiClient(context: Context): ApiClient {
  return hc<ServiceApiAppType>('http://127.0.0.1:8788', {
    fetch: context.env.SERVICE_API.fetch.bind(context.env.SERVICE_API),
  });
}

export function getGuild(apiClient: ApiClient, guildId: string): Promise<Guild> {
  const guildApi = apiClient.guild[':guildId'];
  if (!guildApi) throw new Error('Guild API not available');
  return parseResponse(guildApi.$get({ param: { guildId } }));
}

export function searchGuild(apiClient: ApiClient, name: string): Promise<Guild> {
  const guildApi = apiClient.guild['search'];
  if (!guildApi) throw new Error('Guild API not available');
  return parseResponse(guildApi.$get({ query: { name } }));
}

export function getColor(apiClient: ApiClient, colorId: number): Promise<Color> {
  const colorApi = apiClient.color[':colorId'];
  if (!colorApi) throw new Error('Color API not available');
  return parseResponse(colorApi.$get({ param: { colorId } }));
}

export function getColors(apiClient: ApiClient, colorIds: number[]): Promise<Color[]> {
  return Promise.all(colorIds.map((id) => getColor(apiClient, id))).then((results) => results.flat());
}

export function getEmblemLayer(
  apiClient: ApiClient,
  layer: 'background' | 'foreground',
  emblemId: number,
): Promise<Emblem> {
  const emblemLayerApi = apiClient.emblem[':layer/:emblemId'];
  if (!emblemLayerApi) throw new Error(`Emblem API not available`);
  return parseResponse(emblemLayerApi.$get({ param: { layer, emblemId } })).then(([result]) => result);
}

export async function getEmblemBytes(
  apiClient: ApiClient,
  guildId: string,
  cacheProviders: ReturnType<typeof createCacheProviders>,
): Promise<Uint8Array> {
  let guild;

  try {
    guild = await getGuild(apiClient, guildId);
  } catch (err) {
    if (err instanceof DetailedError && err.statusCode === 404) {
      return Promise.reject({ message: 'Guild not found', status: 404 });
    }
    throw err;
  }

  if (!guild) {
    return Promise.reject({ message: 'Guild not found', status: 404 });
  }

  if (!guild.emblem) {
    return Promise.reject({ message: 'Guild emblem not found', status: 404 });
  }

  // Prepare IDs
  const backgroundId = guild.emblem.background.id;
  const foregroundId = guild.emblem.foreground.id;
  const uniqueColorIds = Array.from(new Set([...guild.emblem.background.colors, ...guild.emblem.foreground.colors])); // Remove duplicates

  // Fetch Definitions & Colors
  const [bgDefs, fgDefs, colors] = await Promise.all([
    backgroundId ? getEmblemLayer(apiClient, 'background', backgroundId) : null,
    foregroundId ? getEmblemLayer(apiClient, 'foreground', foregroundId) : null,
    uniqueColorIds.length > 0 ? await getColors(apiClient, uniqueColorIds) : null,
  ]);

  if (!colors) {
    throw { message: 'Colors not found', status: 500 };
  }

  const bgDef = bgDefs ?? null;
  const fgDef = fgDefs ?? null;

  const bgLayer = bgDef?.layers[0] ?? null;
  const fgLayer1 = fgDef?.layers[1] ?? null;
  const fgLayer2 = fgDef?.layers[2] ?? null;

  const [bgBuf, fgBuf1, fgBuf2] = await Promise.all([
    getTextureArrayBuffer(bgLayer, cacheProviders.objectStore),
    getTextureArrayBuffer(fgLayer1, cacheProviders.objectStore),
    getTextureArrayBuffer(fgLayer2, cacheProviders.objectStore),
  ]);

  const emblem = await renderEmblem(guild.emblem, colors, bgBuf, fgBuf1, fgBuf2);

  return emblem.get_bytes_webp();
}
