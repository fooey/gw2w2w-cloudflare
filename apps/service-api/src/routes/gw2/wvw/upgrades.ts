import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getWvWUpgrade } from '#lib/resources/wvw/upgrades.ts';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwUpgradesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const upgrades = await getWvWUpgrade('all', c.env);
    return withCacheJson(c, CACHE_TTL.static.http, upgrades);
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const id = c.req.param('id');
    const upgrades = await getWvWUpgrade(Number(id), c.env);
    const upgrade = upgrades[0];
    if (!upgrade) {
      const payload: ErrorPayload = {
        message: 'WvW Upgrade Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/upgrades',
      };
      return c.json(payload, 404);
    }
    return withCacheJson(c, CACHE_TTL.static.http, upgrade);
  });
