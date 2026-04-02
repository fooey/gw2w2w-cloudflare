import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '@service-api/index';
import { withCacheJson } from '@service-api/lib/cache-providers/cf-cache';
import { CACHE_TTL } from '@service-api/lib/resources/constants';
import { getWvWUpgrade } from '@service-api/lib/resources/wvw/upgrades';
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
