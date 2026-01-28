import type { AppType as Gw2ApiAppType } from '@repo/service-gw2api';
import {
  fetchBinaryAsBuffer,
  getColor,
  getEmblemBackground,
  getEmblemForeground,
  type CacheProviders,
} from '@repo/service-gw2api/lib/resources';
import { hc, parseResponse, DetailedError } from 'hono/client';
import type { InferRequestType, InferResponseType } from 'hono/client';
import { renderEmblem } from '../../../../../packages/emblem-renderer/src';

const R2_TTL = 86400; // 24 hours
const enableCacheLogging = true;

export async function renderEmblemById(
  guildId: string,
  cacheProviders: CacheProviders,
  env: { apiClient: Fetcher },
): Promise<Uint8Array> {
  const { objectStore } = cacheProviders;
  const R2_KEY = `emblem:${guildId}`;

  // const object = await objectStore.get(R2_KEY);
  // if (object !== null) {
  //   if (enableCacheLogging) console.log(`r2 HIT for ${R2_KEY}`);
  //   return new Uint8Array(await object.arrayBuffer());
  // }
  // if (enableCacheLogging) console.log(`r2 MISS for ${R2_KEY}`);

  const apiClient = hc<Gw2ApiAppType>('http://127.0.0.1:8788', {
    fetch: env.apiClient.fetch.bind(env.apiClient),
  });

  type GuildType = InferRequestType<
    (typeof apiClient.gw2api.guild)[':guildId']
  >['form'];

  // 1. Fetch Guild Data

  const guild = await parseResponse(
    apiClient.gw2api.guild[':guildId']!.$get({
      param: {
        guildId,
      },
    }),
  ).catch((e: DetailedError) => {
    console.error(e);
  });

  if (!guild) {
    throw { message: 'Guild not found', status: 404 };
  }

  if (!guild.emblem) {
    throw { message: 'Guild has no emblem', status: 404 };
  }
  // Prepare IDs
  const bgId = guild.emblem.background.id;
  const fgId = guild.emblem.foreground.id;
  const colorIds = [
    ...guild.emblem.background.colors,
    ...guild.emblem.foreground.colors,
  ];
  const uniqueColorIds = [...new Set(colorIds)];

  // Fetch Definitions & Colors
  const [bgDefs, fgDefs, colors] = await Promise.all([
    bgId ? getEmblemBackground(bgId, cacheProviders) : null,
    fgId ? getEmblemForeground(fgId, cacheProviders) : null,
    uniqueColorIds.length > 0 ? getColor(uniqueColorIds, cacheProviders) : null,
  ]);

  if (!colors) {
    throw { message: 'Colors not found', status: 500 };
  }

  const bgDef = bgDefs ? bgDefs[0] : null;
  const fgDef = fgDefs ? fgDefs[0] : null;

  const bgLayer = bgDef?.layers[0] ?? null;
  const fgLayer1 = fgDef?.layers[1] ?? null;
  const fgLayer2 = fgDef?.layers[2] ?? null;

  const [bgBuf, fgBuf1, fgBuf2] = await Promise.all([
    fetchBinaryAsBuffer(bgLayer, cacheProviders),
    fetchBinaryAsBuffer(fgLayer1, cacheProviders),
    fetchBinaryAsBuffer(fgLayer2, cacheProviders),
  ]);

  const emblem = await renderEmblem(
    guild.emblem,
    colors,
    bgBuf,
    fgBuf1,
    fgBuf2,
  );

  const bytes = emblem.get_bytes_webp();

  await objectStore.put(R2_KEY, bytes, {
    customMetadata: {
      expiresAt: new Date(Date.now() + R2_TTL * 1000).toISOString(),
    },
    httpMetadata: {
      contentType: 'image/webp',
    },
  });

  return bytes;
}
