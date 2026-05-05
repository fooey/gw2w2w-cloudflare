import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { getColor } from '#lib/resources/color.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';

export const apiColorRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List all colors',
      description: 'Returns all GW2 dye color definitions. Cached per build patch cycle.',
      tags: ['GW2 Colors'],
      responses: {
        200: { description: 'Array of color objects' },
      },
    }),
    async (c) => {
      const colors = await getColor('all', c.env);
      return withCacheJson(c, CACHE_TTL.patch.http, colors);
    },
  )
  .get(
    '/:colorId',
    describeRoute({
      summary: 'Get color by ID',
      description: 'Returns a single GW2 dye color definition.',
      tags: ['GW2 Colors'],
      responses: {
        200: { description: 'Color object' },
        404: { description: 'Color not found' },
      },
    }),
    validator('param', z.object({ colorId: z.coerce.number().nonnegative().nonoptional() })),
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

      return withCacheJson(c, CACHE_TTL.patch.http, color);
    },
  );
