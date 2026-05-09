import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getEmblemBackground, getEmblemForeground } from '#lib/resources/emblem.ts';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';

const layerSlugs = ['background', 'foreground'] as const;
const layerSlugSchema = z.enum(layerSlugs);

export const apiEmblemRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/background',
    describeRoute({
      summary: 'List all backgrounds',
      description: 'Returns all emblem background layer definitions.',
      tags: ['GW2 Emblems'],
      responses: { 200: { description: 'Array of background layers' }, 404: { description: 'Not found' } },
    }),
    async (c) => {
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
    },
  )
  .get(
    '/foreground',
    describeRoute({
      summary: 'List all foregrounds',
      description: 'Returns all emblem foreground layer definitions.',
      tags: ['GW2 Emblems'],
      responses: { 200: { description: 'Array of foreground layers' }, 404: { description: 'Not found' } },
    }),
    async (c) => {
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
    },
  )
  .get(
    '/:layer/:emblemId',
    describeRoute({
      summary: 'Get emblem layer by ID',
      description: 'Returns a specific background or foreground emblem layer.',
      tags: ['GW2 Emblems'],
      responses: { 200: { description: 'Emblem layer object' }, 404: { description: 'Not found' } },
    }),
    validator(
      'param',
      z.object({
        layer: layerSlugSchema,
        emblemId: z.coerce.number().nonnegative().max(999).nonoptional(),
      }),
    ),
    async (c) => {
      const { layer, emblemId } = c.req.param();

      const getEmblemLayer = layer === 'background' ? getEmblemBackground : getEmblemForeground;

      const results = await getEmblemLayer(Number(emblemId), c.env);
      const emblem = results?.[0];
      if (!emblem) {
        const payload: ErrorPayload = {
          message: 'Emblem Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/emblem',
        };
        return c.json(payload, 404);
      }

      return withCacheJson(c, CACHE_TTL.patch.http, emblem);
    },
  );
