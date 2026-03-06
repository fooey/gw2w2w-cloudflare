import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getColor } from '@service-api/lib/resources/color';
import type { Color } from '@service-api/lib/types';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiColorRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/:colorId',
    zValidator('param', z.object({ colorId: z.coerce.number().nonnegative().max(999).nonoptional() })),
    async (c) => {
      const colorId = Number(c.req.param('colorId'));

      return getColor(colorId, c.env).then((color) => {
        if (!Array.isArray(color) || color.length !== 1) {
          const payload: ErrorPayload = {
            message: 'Color Not Found',
            statusCode: 404,
            url: new URL(c.req.url).pathname,
            service: 'service-api/color',
          };
          return c.json(payload, payload.statusCode);
        }

        return c.json<Color[]>(color);
      });
    },
  )
  .get('*', (c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/color',
    };
    return c.json(payload, payload.statusCode);
  });
