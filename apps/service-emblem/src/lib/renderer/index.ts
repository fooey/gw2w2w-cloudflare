import type { CloudflareEnv } from '@/index';
import { zValidator } from '@hono/zod-validator';
import { renderEmblem } from '@repo//emblem-renderer/src';
import type { AppType as Gw2ApiAppType } from '@repo/service-gw2api';
import { createCacheProviders } from '@repo/service-gw2api/lib/cache-providers';
import {
  fetchBinaryAsBuffer,
  getEmblemBackground,
  getEmblemForeground,
  type Color,
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
    const bgId = guild.emblem.background.id;
    const fgId = guild.emblem.foreground.id;
    const colorIds = [...guild.emblem.background.colors, ...guild.emblem.foreground.colors];
    const uniqueColorIds = [...new Set(colorIds)];

    // Fetch Definitions & Colors
    const [bgDefs, fgDefs, colors] = await Promise.all([
      bgId ? getEmblemBackground(bgId, cacheProviders) : null,
      fgId ? getEmblemForeground(fgId, cacheProviders) : null,
      uniqueColorIds.length > 0 ? await getColors(apiClient, uniqueColorIds) : null,
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
