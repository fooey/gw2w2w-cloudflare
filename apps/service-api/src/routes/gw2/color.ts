import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getColor } from '@service-api/lib/resources/color';
import type { Color } from '@service-api/lib/types';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiColorRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const colors = await getColor('all', c.env);
    return c.json<Color[]>(colors, 200);
  })
  .get(
    '/:colorId',
    zValidator('param', z.object({ colorId: z.coerce.number().nonnegative().max(999).nonoptional() })),
    async (c) => {
      const colorId = Number(c.req.param('colorId'));

      const color = await getColor(colorId, c.env);
      if (!Array.isArray(color) || color.length !== 1) {
        const payload: ErrorPayload = {
          message: 'Color Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/color',
        };
        return c.json(payload, 404);
      }

      return c.json<Color[]>(color, 200);
    },
  );
