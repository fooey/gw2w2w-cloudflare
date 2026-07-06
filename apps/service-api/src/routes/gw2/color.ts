import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { getColor } from '#lib/resources/color.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { ColorSchema } from '#lib/types/Color.ts';
import { Hono } from 'hono';
import { describeRoute, validator, resolver } from 'hono-openapi';
import { z } from 'zod';

export const apiColorRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List all colors',
      description:
        'Returns all GW2 dye color definitions. Cached per build patch cycle. Proxied from [GW2 API v2/colors](https://wiki.guildwars2.com/wiki/API:2/colors).',
      tags: ['GW2 Colors'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(ColorSchema)) } },
          description: 'Array of color objects',
        },
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
      description:
        'Returns a single GW2 dye color definition. Proxied from [GW2 API v2/colors](https://wiki.guildwars2.com/wiki/API:2/colors).',
      tags: ['GW2 Colors'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(ColorSchema) } },
          description: 'Color object',
        },
        404: { description: 'Color not found' },
      },
    }),
    validator('param', z.object({ colorId: z.coerce.number().nonnegative().nonoptional() })),
    async (c) => {
      const colorId = Number(c.req.param('colorId'));

      const colors = await getColor(colorId, c.env);
      const [color] = colors;
      if (!color) {
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
