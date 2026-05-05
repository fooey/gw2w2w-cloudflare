import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getWvWObjective } from '#lib/resources/wvw/objectives.ts';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';

export const apiWvwObjectivesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List all WvW objectives',
      tags: ['GW2 WvW Reference'],
      responses: { 200: { description: 'Array of WvW objective objects' } },
    }),
    async (c) => {
      const objectives = await getWvWObjective('all', c.env);

      return withCacheJson(c, CACHE_TTL.patch.http, objectives);
    },
  )
  .get(
    '/:id',
    describeRoute({
      summary: 'Get WvW objective by ID',
      tags: ['GW2 WvW Reference'],
      responses: { 200: { description: 'WvW objective object' }, 404: { description: 'Not found' } },
    }),
    validator('param', z.object({ id: z.string() })),
    async (c) => {
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
      return withCacheJson(c, CACHE_TTL.patch.http, objective);
    },
  );
