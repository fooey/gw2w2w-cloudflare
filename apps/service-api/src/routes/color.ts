import type { CloudflareEnv } from '@api/index';
import { getColor } from '@api/lib/resources/color';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiColorRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
  '/:colorId',
  zValidator('param', z.object({ colorId: z.coerce.number().nonnegative().max(999).nonoptional() })),
  async (c) => {
    const colorId = Number(c.req.param('colorId'));

    return getColor(colorId, c.env).then((color) => {
      if (!color) {
        return c.json({ error: { message: 'Color not found', status: 404 }, colorId }, 404);
      }

      return c.json(color);
    });
  },
);
