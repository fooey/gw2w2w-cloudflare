import type { CloudflareEnv } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { getColor } from '@/lib/resources/color';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export default new Hono<{ Bindings: CloudflareEnv }>().get(
  '/:colorId',
  zValidator('param', z.object({ colorId: z.coerce.number().nonnegative().max(999).nonoptional() })),
  async (c) => {
    const colorId = Number(c.req.param('colorId'));

    return getColor(colorId, c.env).then((color) => {
      if (!color) {
        return c.notFound();
      }

      return c.json(color);
    });
  },
);
