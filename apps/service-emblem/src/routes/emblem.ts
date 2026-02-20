import type { CloudflareEnv } from '@/index';
import { getApiClient, getEmblemBytes, searchGuild } from '@/lib/api';
import { zValidator } from '@hono/zod-validator';
import { createCacheProviders } from '@repo/service-api/lib/cache-providers';
import { validateArenaNetUuid } from '@repo/utils';
import { Hono } from 'hono';
import z from 'zod';

const R2_TTL = 86400; // 24 hours
const enableCacheLogging = true;

export const serviceEmblemRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
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
        return c.json({ error: { message: 'Guild not found', status: 404 } }, 404);
      }
    }

    if (guildId == null) {
      return c.json({ error: { message: 'Guild not found', status: 404 } }, 404);
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
