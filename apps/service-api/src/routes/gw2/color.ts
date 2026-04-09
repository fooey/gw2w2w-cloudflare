import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { getColor } from '#lib/resources/color.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiColorRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const colors = await getColor('all', c.env);
    return withCacheJson(c, CACHE_TTL.static.http, colors);
  })
  .get(
    '/:colorId',
    zValidator('param', z.object({ colorId: z.coerce.number().nonnegative().nonoptional() })),
    async (c) => {
      const colorId = Number(c.req.param('colorId'));

      const color = await getColor(colorId, c.env);
      if (!Array.isArray(color) || color.length !== 1) {
        const payload: ErrorPayload = {
          message: 'Color Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/color',
        };
        return c.json(payload, 404);
      }

      return withCacheJson(c, CACHE_TTL.static.http, color);
    },
  );
