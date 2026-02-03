import type { CloudflareEnv } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { getColor } from '@/lib/resources';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export default new Hono<{ Bindings: CloudflareEnv }>().get(
  '/:colorId',
  zValidator('param', z.object({ colorId: z.string() })),
  async (c) => {
    const colorId = Number(c.req.param('colorId'));

    console.log(`🚀 ~ color.ts ~ colorId:`, colorId);

    return getColor(colorId, createCacheProviders(c.env)).then((color) => {
      if (!color) {
        return c.notFound();
      }

      return c.json(color);
    });
  }
);
