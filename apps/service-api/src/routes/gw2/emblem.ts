import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getEmblemBackground, getEmblemForeground } from '#lib/resources/emblem.ts';
import { Hono } from 'hono';
import { z } from 'zod';

const layerSlugs = ['background', 'foreground'] as const;
const layerSlugSchema = z.enum(layerSlugs);

export const apiEmblemRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/background', async (c) => {
    const result = await getEmblemBackground('all', c.env);
    if (!result) {
      const payload: ErrorPayload = {
        message: 'Emblem Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/emblem',
      };
      return c.json(payload, 404);
    }
    return withCacheJson(c, CACHE_TTL.patch.http, result);
  })
  .get('/foreground', async (c) => {
    const result = await getEmblemForeground('all', c.env);
    if (!result) {
      const payload: ErrorPayload = {
        message: 'Emblem Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/emblem',
      };
      return c.json(payload, 404);
    }
    return withCacheJson(c, CACHE_TTL.patch.http, result);
  })
  .get(
    '/:layer/:emblemId',
    zValidator(
      'param',
      z.object({
        layer: layerSlugSchema,
        emblemId: z.coerce.number().nonnegative().max(999).nonoptional(),
      }),
    ),
    async (c) => {
      const { layer, emblemId } = c.req.param();

      const getEmblemLayer = layer === 'background' ? getEmblemBackground : getEmblemForeground;

      const result = await getEmblemLayer(Number(emblemId), c.env);
      if (!result) {
        const payload: ErrorPayload = {
          message: 'Emblem Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/emblem',
        };
        return c.json(payload, 404);
      }

      return withCacheJson(c, CACHE_TTL.patch.http, result);
    },
  );
