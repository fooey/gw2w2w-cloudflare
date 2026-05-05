import { zValidator } from '@hono/zod-validator';
import { DEFAULT_EMBLEM_SIZE, EMBLEM_SIZES, type EmblemSize } from '@repo/emblem-renderer';
import { CACHE_TTL } from '@repo/service-api/lib/resources/constants';
import { createCacheProviders } from '@repo/service-api/lib/cache-providers';
import { validateArenaNetUuid } from '@repo/utils';
import type { CloudflareEnv } from '#index.ts';
import { getApiClient, getEmblemBytes, getEmblemBytesByGuildId, HttpError, searchGuild } from '#lib/api.ts';
import { Hono } from 'hono';
import z from 'zod';

const getEnableCacheLogging = () => true;

const redirectFileExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const replaceFileExtensionRegex = new RegExp(`(${redirectFileExtensions.join('|')})$`);

const sizeQuery = z.coerce
  .number()
  .int()
  .refine((n): n is EmblemSize => (EMBLEM_SIZES as readonly number[]).includes(n), {
    message: `Size must be one of: ${EMBLEM_SIZES.join(', ')}`,
  })
  .default(DEFAULT_EMBLEM_SIZE);

export const serviceEmblemRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/custom',
    zValidator(
      'query',
      z.object({
        background_id: z.coerce.number().int().positive().optional(),
        background_color_id: z.coerce.number().int().positive().optional(),
        foreground_id: z.coerce.number().int().positive().optional(),
        foreground_primary_color_id: z.coerce.number().int().positive().optional(),
        foreground_secondary_color_id: z.coerce.number().int().positive().optional(),
        flags_flip_bg_horizontal: z.string().optional(),
        flags_flip_bg_vertical: z.string().optional(),
        flags_flip_fg_horizontal: z.string().optional(),
        flags_flip_fg_vertical: z.string().optional(),
        size: sizeQuery,
      }),
    ),
    async (c) => {
      const query = c.req.valid('query');
      const size = query.size;
      const cacheProviders = createCacheProviders(c.env);
      const apiClient = getApiClient(c);

      const flags: (
        | 'FlipBackgroundHorizontal'
        | 'FlipBackgroundVertical'
        | 'FlipForegroundHorizontal'
        | 'FlipForegroundVertical'
      )[] = [];
      if (query.flags_flip_bg_horizontal !== undefined) flags.push('FlipBackgroundHorizontal');
      if (query.flags_flip_bg_vertical !== undefined) flags.push('FlipBackgroundVertical');
      if (query.flags_flip_fg_horizontal !== undefined) flags.push('FlipForegroundHorizontal');
      if (query.flags_flip_fg_vertical !== undefined) flags.push('FlipForegroundVertical');

      const emblem = {
        background: {
          id: query.background_id ?? 1,
          colors: [query.background_color_id].filter((c): c is number => c !== undefined),
        },
        foreground: {
          id: query.foreground_id ?? 1,
          colors: [query.foreground_primary_color_id, query.foreground_secondary_color_id].filter(
            (c): c is number => c !== undefined,
          ),
        },
        flags,
      };

      try {
        const bytes = await getEmblemBytes(apiClient, emblem, cacheProviders, size);
        return new Response(bytes, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (error: unknown) {
        if (error instanceof HttpError) {
          return new Response(JSON.stringify({ error: { message: error.message, status: error.status } }), {
            status: error.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw error;
      }
    },
  )
  .get('/:guildId/:sizeExt', (c) => {
    const guildId = c.req.param('guildId');
    const sizeExt = c.req.param('sizeExt');
    const sizeStr = sizeExt.replace(/\.\w+$/, '');
    const sizeNum = Number(sizeStr);

    if (!Number.isInteger(sizeNum) || !(EMBLEM_SIZES as readonly number[]).includes(sizeNum)) {
      return c.json({ error: { message: `Size must be one of: ${EMBLEM_SIZES.join(', ')}`, status: 400 } }, 400);
    }

    const size = sizeNum as EmblemSize;
    const url = size === DEFAULT_EMBLEM_SIZE ? `/${guildId}` : `/${guildId}?size=${size}`;
    return c.redirect(url, 301);
  })
  .get(
    '/:guildId',
    zValidator('param', z.object({ guildId: z.string() })),
    zValidator('query', z.object({ size: sizeQuery })),
    async (c) => {
      const cacheProviders = createCacheProviders(c.env);
      let guildId = c.req.param('guildId');
      const size = c.req.valid('query').size;

      if (redirectFileExtensions.some((ext) => guildId.endsWith(ext))) {
        // pop the file extension off the end of the guildId
        guildId = guildId.replace(replaceFileExtensionRegex, '');
      }

      const { objectStore } = cacheProviders;
      const apiClient = getApiClient(c);

      if (!validateArenaNetUuid(guildId)) {
        try {
          const guild = await searchGuild(apiClient, guildId);

          guildId = guild.id;
        } catch (_error) {
          return c.json({ error: { message: 'Guild not found', status: 404 } }, 404);
        }
      }

      const cacheKey = `emblems:${guildId}:${size}`;

      let bytes: Uint8Array | null;

      const object = await objectStore.get(cacheKey);
      const expiresAt = object?.customMetadata?.expiresAt;
      const expiresAtTimestamp = expiresAt ? Date.parse(expiresAt) : Number.NaN;
      const hasValidExpiry = Number.isFinite(expiresAtTimestamp) && expiresAtTimestamp > Date.now();

      if (object !== null && hasValidExpiry) {
        if (getEnableCacheLogging()) console.info(`r2 HIT for ${cacheKey}`);
        bytes = new Uint8Array(await object.arrayBuffer());
      } else {
        if (getEnableCacheLogging()) console.info(`r2 MISS for ${cacheKey}`);
        try {
          bytes = await getEmblemBytesByGuildId(apiClient, guildId, cacheProviders, size);
        } catch (error: unknown) {
          if (error instanceof HttpError) {
            return new Response(JSON.stringify({ error: { message: error.message, status: error.status } }), {
              status: error.status,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          throw error;
        }

        c.executionCtx.waitUntil(
          objectStore.put(cacheKey, bytes, {
            customMetadata: {
              expiresAt: new Date(Date.now() + CACHE_TTL.user.kv * 1000).toISOString(),
            },
            httpMetadata: {
              contentType: 'image/webp',
            },
          }),
        );
      }

      return new Response(bytes, {
        headers: { 'Content-Type': 'image/webp' },
      });
    },
  );
