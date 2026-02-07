import type { CloudflareEnv } from '@/index';
import { zValidator } from '@hono/zod-validator';
import { renderEmblem } from '@repo//emblem-renderer/src';
import type { AppType as Gw2ApiAppType } from '@repo/service-gw2api';
import { createCacheProviders } from '@repo/service-gw2api/lib/cache-providers';
import {
  fetchBinaryAsBuffer,
  // fetchBinaryAsBuffer,
  // getEmblemBackground,
  // getEmblemForeground,
  type Color,
  type Emblem,
  type Guild,
} from '@repo/service-gw2api/lib/resources';
import { Hono } from 'hono';
import { DetailedError, hc, parseResponse } from 'hono/client';
import z from 'zod';

const R2_TTL = 86400; // 24 hours
const enableCacheLogging = true;

type ApiClient = ReturnType<typeof hc<Gw2ApiAppType>>;

function getGuild(apiClient: ApiClient, guildId: string): Promise<Guild> {
  const guildApi = apiClient.gw2api.guild[':guildId'];
  if (!guildApi) throw new Error('Guild API not available');
  return parseResponse(guildApi.$get({ param: { guildId } }));
}

function getColor(apiClient: ApiClient, colorId: number): Promise<Color> {
  const colorApi = apiClient.gw2api.color[':colorId'];
  if (!colorApi) throw new Error('Color API not available');
  return parseResponse(colorApi.$get({ param: { colorId } }));
}

function getColors(apiClient: ApiClient, colorIds: number[]): Promise<Color[]> {
  return Promise.all(colorIds.map((id) => getColor(apiClient, id))).then((results) => results.flat());
}

function getEmblem(apiClient: ApiClient, type: 'background' | 'foreground', emblemId: number): Promise<Emblem> {
  console.log(`🚀 ~ index.ts ~ getEmblem:`, { type, emblemId });

  const emblemApi = apiClient.gw2api.emblem[`${type}/:emblemId`];
  if (!emblemApi) throw new Error(`Emblem API not available`);
  return parseResponse(emblemApi.$get({ param: { emblemId } })).then(([result]) => result);
}

export default new Hono<{ Bindings: CloudflareEnv }>().get(
  '/:guildId',
  zValidator('param', z.object({ guildId: z.string() })),
  async (c) => {
    const cacheProviders = createCacheProviders(c.env);
    const guildId = c.req.param('guildId');
    const { objectStore } = cacheProviders;
    const R2_KEY = `emblem:${guildId}`;

    // const object = await objectStore.get(R2_KEY);
    // if (object !== null) {
    //   if (enableCacheLogging) console.log(`r2 HIT for ${R2_KEY}`);
    //   return new Uint8Array(await object.arrayBuffer());
    // }
    // if (enableCacheLogging) console.log(`r2 MISS for ${R2_KEY}`);

    const apiClient = hc<Gw2ApiAppType>('http://127.0.0.1:8788', {
      fetch: c.env.SERVICE_GW2API.fetch.bind(c.env.SERVICE_GW2API),
    });

    let guild;

    try {
      guild = await getGuild(apiClient, guildId);
    } catch (err) {
      if (err instanceof DetailedError && err.statusCode === 404) {
        return c.notFound();
      }
      throw err;
    }

    if (!guild) {
      return c.notFound();
    }

    if (!guild.emblem) {
      return c.notFound();
    }

    // Prepare IDs
    const backgroundId = guild.emblem.background.id;
    const foregroundId = guild.emblem.foreground.id;
    const uniqueColorIds = Array.from(new Set([...guild.emblem.background.colors, ...guild.emblem.foreground.colors])); // Remove duplicates

    // Fetch Definitions & Colors
    const [bgDefs, fgDefs, colors] = await Promise.all([
      backgroundId ? getEmblem(apiClient, 'background', backgroundId) : null,
      foregroundId ? getEmblem(apiClient, 'foreground', foregroundId) : null,
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
      fetchBinaryAsBuffer(bgLayer, cacheProviders),
      fetchBinaryAsBuffer(fgLayer1, cacheProviders),
      fetchBinaryAsBuffer(fgLayer2, cacheProviders),
    ]);

    const emblem = await renderEmblem(guild.emblem, colors, bgBuf, fgBuf1, fgBuf2);

    const bytes = emblem.get_bytes_webp();

    await objectStore.put(R2_KEY, bytes, {
      customMetadata: {
        expiresAt: new Date(Date.now() + R2_TTL * 1000).toISOString(),
      },
      httpMetadata: {
        contentType: 'image/webp',
      },
    });

    return new Response(bytes, {
      headers: { 'Content-Type': 'image/webp' },
    });
  },
);
