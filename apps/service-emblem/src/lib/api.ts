import { renderEmblem } from '@repo/emblem-renderer/index';
import type { ServiceApiAppType } from '@repo/service-api';
import type { createCacheProviders } from '@repo/service-api/lib/cache-providers';
import { getTextureArrayBuffer } from '@repo/service-api/lib/resources';
import { type Color, type Emblem, type Guild } from '@repo/service-api/lib/types';
import type { CloudflareEnv } from '@service-emblem/index';
import { type Context } from 'hono';
import { DetailedError, hc, parseResponse } from 'hono/client';

export type ApiClient = ReturnType<typeof hc<ServiceApiAppType>>;

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function getApiClient(
  context: Context<{
    Bindings: CloudflareEnv;
  }>,
): ApiClient {
  return hc<ServiceApiAppType>('http://127.0.0.1:8788', {
    fetch: context.env.SERVICE_API.fetch.bind(context.env.SERVICE_API),
  });
}

export function getGuild(apiClient: ApiClient, guildId: string): Promise<Guild> {
  const guildApi = apiClient.gw2.guild[':guildId'];
  return parseResponse(guildApi.$get({ param: { guildId } }));
}

export function searchGuild(apiClient: ApiClient, name: string): Promise<Guild> {
  const guildApi = apiClient.gw2.guild['search'];
  return parseResponse(guildApi.$get({ query: { name } }));
}

export function getColor(apiClient: ApiClient, colorId: number): Promise<Color[]> {
  const colorApi = apiClient.gw2.color[':colorId'];
  return parseResponse(colorApi.$get({ param: { colorId: colorId.toString() } }));
}

export function getColors(apiClient: ApiClient, colorIds: number[]): Promise<Color[]> {
  return Promise.all(colorIds.map((id) => getColor(apiClient, id))).then((results) => results.flat());
}

export function getEmblemLayer(
  apiClient: ApiClient,
  layer: 'background' | 'foreground',
  emblemId: number,
): Promise<Emblem> {
  const emblemLayerApi = apiClient.gw2.emblem[':layer'][':emblemId'];
  return parseResponse(emblemLayerApi.$get({ param: { layer, emblemId: emblemId.toString() } })).then(
    ([result]) => result as unknown as Emblem,
  );
}

export async function getEmblemBytes(
  apiClient: ApiClient,
  guildId: string,
  cacheProviders: ReturnType<typeof createCacheProviders>,
): Promise<Uint8Array> {
  let guild: Guild | null;

  try {
    guild = await getGuild(apiClient, guildId);
  } catch (err) {
    if (err instanceof DetailedError && err.statusCode === 404) {
      throw new HttpError(404, 'Guild not found');
    }
    throw err;
  }

  if (!guild.emblem) {
    throw new HttpError(404, 'Guild emblem not found');
  }

  // Prepare IDs
  const backgroundId = guild.emblem.background.id;
  const foregroundId = guild.emblem.foreground.id;
  const uniqueColorIds = Array.from(new Set([...guild.emblem.background.colors, ...guild.emblem.foreground.colors])); // Remove duplicates

  // Fetch Definitions & Colors
  const [bgDefs, fgDefs, colors] = await Promise.all([
    backgroundId ? getEmblemLayer(apiClient, 'background', backgroundId) : null,
    foregroundId ? getEmblemLayer(apiClient, 'foreground', foregroundId) : null,
    uniqueColorIds.length > 0 ? getColors(apiClient, uniqueColorIds) : null,
  ]);

  if (!colors) {
    throw new HttpError(500, 'Colors not found');
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

  const emblem = renderEmblem(guild.emblem, colors, bgBuf, fgBuf1, fgBuf2);

  return emblem.get_bytes_webp();
}
