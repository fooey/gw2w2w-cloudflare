import type { CloudflareEnv } from '@/index';
import { getGuild, searchGuild } from '@/lib/resources/guild';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export default new Hono<{ Bindings: CloudflareEnv }>()
  .get('/search', zValidator('query', z.object({ name: z.string() })), async (c) => {
    const name = c.req.query('name');

    if (!name) {
      return c.notFound();
    }

    return searchGuild(name, c.env).then((guildId) => {
      if (!guildId) {
        return c.notFound();
      }

      return c.redirect(`./${guildId}`, 308);
    });
  })
  .get('/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
    const guildId = c.req.param('guildId');

    return getGuild(guildId, c.env).then((guild) => {
      if (!guild) {
        return c.notFound();
      }

      return c.json(guild);
    });
  });
