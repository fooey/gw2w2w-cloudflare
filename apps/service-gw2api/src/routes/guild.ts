import type { CloudflareEnv } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { getGuild, searchGuild } from '@/lib/resources/guild';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export default new Hono<{ Bindings: CloudflareEnv }>()
  .get('/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
    const guildId = c.req.param('guildId');

    return getGuild(guildId, createCacheProviders(c.env)).then((guild) => {
      if (!guild) {
        return c.notFound();
      }

      return c.json(guild);
    });
  })
  .get('/search/:name', zValidator('param', z.object({ name: z.string() })), async (c) => {
    const name = c.req.param('name');

    return searchGuild(name, createCacheProviders(c.env)).then((guild) => {
      if (!guild) {
        return c.notFound();
      }

      return c.json(guild);
    });
  });
