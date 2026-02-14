import type { CloudflareEnv } from '@/index';
import { getApiClient, getColors, getEmblem, getGuild, searchGuild, type ApiClient } from '@/lib/api';
import { zValidator } from '@hono/zod-validator';
import { renderEmblem } from '@repo//emblem-renderer/src';
import { createCacheProviders } from '@repo/service-api/lib/cache-providers';
import { getTextureArrayBuffer } from '@repo/service-api/lib/resources';
import { validateArenaNetUuid } from '@repo/utils';
import { Hono } from 'hono';
import { DetailedError } from 'hono/client';
import z from 'zod';

const R2_TTL = 86400; // 24 hours
const enableCacheLogging = true;

export default new Hono<{ Bindings: CloudflareEnv }>().get(
  '/:guildId',
  zValidator('param', z.object({ guildId: z.string() })),
  async (c) => {
    const cacheProviders = createCacheProviders(c.env);
    let guildId = c.req.param('guildId');
    const { objectStore } = cacheProviders;
    const apiClient = getApiClient(c);

    if (!validateArenaNetUuid(guildId)) {
      try {
        const guild = await searchGuild(apiClient, guildId);

        guildId = guild.id;
      } catch (error) {
        return c.notFound();
      }
    }

    if (guildId == null) {
      return c.notFound();
    }

    const cacheKey = `emblems:${guildId}`;

    let bytes: Uint8Array<ArrayBufferLike> | null = null;

    const object = await objectStore.get(cacheKey);
    if (object !== null) {
      if (enableCacheLogging) console.info(`r2 HIT for ${cacheKey}`);
      bytes = new Uint8Array(await object.arrayBuffer());
    } else {
      if (enableCacheLogging) console.info(`r2 MISS for ${cacheKey}`);
      try {
        bytes = await getEmblemBytes(apiClient, guildId, cacheProviders);
      } catch (error: unknown) {
        if (
          error instanceof Object &&
          'status' in error &&
          'message' in error &&
          typeof error.status === 'number' &&
          typeof error.message === 'string'
        ) {
          return new Response(JSON.stringify({ error }), {
            status: error.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        throw error;
      }
    }

    // await objectStore.put(cacheKey, bytes, {
    //   customMetadata: {
    //     expiresAt: new Date(Date.now() + R2_TTL * 1000).toISOString(),
    //   },
    //   httpMetadata: {
    //     contentType: 'image/webp',
    //   },
    // });

    return new Response(bytes, {
      headers: { 'Content-Type': 'image/webp' },
    });
  },
);

async function getEmblemBytes(
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
    getTextureArrayBuffer(bgLayer, cacheProviders.objectStore),
    getTextureArrayBuffer(fgLayer1, cacheProviders.objectStore),
    getTextureArrayBuffer(fgLayer2, cacheProviders.objectStore),
  ]);

  const emblem = await renderEmblem(guild.emblem, colors, bgBuf, fgBuf1, fgBuf2);

  return emblem.get_bytes_webp();
}
