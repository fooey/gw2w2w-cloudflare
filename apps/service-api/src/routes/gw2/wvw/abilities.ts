import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getWvWAbility, type WvWAbility } from '@service-api/lib/resources/wvw/abilities';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwAbilitiesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const abilities = await getWvWAbility('all', c.env);
    return c.json<WvWAbility[]>(abilities, 200);
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const id = c.req.param('id');
    const abilities = await getWvWAbility(Number(id), c.env);
    const ability = abilities[0];
    if (!ability) {
      const payload: ErrorPayload = {
        message: 'WvW Ability Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/abilities',
      };
      return c.json(payload, 404);
    }
    return c.json<WvWAbility>(ability, 200);
  });
