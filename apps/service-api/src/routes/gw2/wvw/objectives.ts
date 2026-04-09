import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getWvWObjective } from '#lib/resources/wvw/objectives.ts';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwObjectivesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const objectives = await getWvWObjective('all', c.env);

    return withCacheJson(c, CACHE_TTL.static.http, objectives);
  })
  .get('/:id', zValidator('param', z.object({ id: z.string() })), async (c) => {
    const id = c.req.param('id');
    const objectives = await getWvWObjective(id, c.env);
    const objective = objectives[0];
    if (!objective) {
      const payload: ErrorPayload = {
        message: 'WvW Objective Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/objectives',
      };
      return c.json(payload, 404);
    }
    return withCacheJson(c, CACHE_TTL.static.http, objective);
  });
