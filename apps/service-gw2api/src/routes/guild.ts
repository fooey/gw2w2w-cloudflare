import type { CloudflareEnv } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { getGuild } from '@/lib/resources';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export default new Hono<{ Bindings: CloudflareEnv }>().get(
  '/:guildId',
  zValidator('param', z.object({ guildId: z.string() })),
  async (c) => {
    const guildId = c.req.param('guildId');

    return getGuild(guildId, createCacheProviders(c.env)).then((guild) => {
      if (!guild) {
        c.status(404);
        return c.json({
          message: 'Guild not found',
          status: 404,
        });
      }

      return c.json(guild);
    });
  },
);
