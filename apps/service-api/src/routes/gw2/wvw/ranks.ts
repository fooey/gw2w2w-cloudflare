import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getWvWRank } from '#lib/resources/wvw/ranks.ts';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';

export const apiWvwRanksRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List all WvW ranks',
      description:
        'Returns all WvW rank definitions. Proxied from [GW2 API v2/wvw/ranks](https://wiki.guildwars2.com/wiki/API:2/wvw/ranks).',
      tags: ['GW2 WvW Reference'],
      responses: { 200: { description: 'Array of WvW rank objects' } },
    }),
    async (c) => {
      const ranks = await getWvWRank('all', c.env);
      return withCacheJson(c, CACHE_TTL.patch.http, ranks);
    },
  )
  .get(
    '/:id',
    describeRoute({
      summary: 'Get WvW rank by ID',
      description:
        'Returns a single WvW rank by ID. Proxied from [GW2 API v2/wvw/ranks](https://wiki.guildwars2.com/wiki/API:2/wvw/ranks).',
      tags: ['GW2 WvW Reference'],
      responses: { 200: { description: 'WvW rank object' }, 404: { description: 'Not found' } },
    }),
    validator('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const id = c.req.param('id');
      const ranks = await getWvWRank(Number(id), c.env);
      const rank = ranks[0];
      if (!rank) {
        const payload: ErrorPayload = {
          message: 'WvW Rank Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/ranks',
        };
        return c.json(payload, 404);
      }
      return withCacheJson(c, CACHE_TTL.patch.http, rank);
    },
  );
