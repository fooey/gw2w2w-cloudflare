import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '@service-api/index';
import { withCacheJson } from '@service-api/lib/cache-providers/cf-cache';
import { CACHE_TTL } from '@service-api/lib/resources/constants';
import { getWvWRank } from '@service-api/lib/resources/wvw/ranks';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwRanksRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const ranks = await getWvWRank('all', c.env);
    return withCacheJson(c, CACHE_TTL.static.http, ranks);
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
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
    return withCacheJson(c, CACHE_TTL.static.http, rank);
  });
