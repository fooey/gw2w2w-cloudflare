import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getWvWObjective, type WvWObjective } from '@service-api/lib/resources/wvw/objectives';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwObjectivesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const objectives = await getWvWObjective('all', c.env);
    return c.json<WvWObjective[]>(objectives, 200);
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
    return c.json<WvWObjective>(objective, 200);
  });
