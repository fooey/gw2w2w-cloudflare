import type { CloudflareEnv } from '@/index';
import { getGuild, searchGuild } from '@/lib/resources/guild';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiGuildRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/search', zValidator('query', z.object({ name: z.string() })), async (c) => {
    const name = c.req.query('name');

    if (!name) {
      return c.json({ error: { message: 'Guild not found', status: 404 }, name }, 404);
    }

    return searchGuild(name, c.env).then((guildId) => {
      if (!guildId) {
        return c.json({ error: { message: 'Guild not found', status: 404 }, name }, 404);
      }

      return getGuild(guildId, c.env).then((guild) => {
        if (!guild) {
          return c.json({ error: { message: 'Guild not found', status: 404 }, name }, 404);
        }

        // Set canonical location header to the direct guild endpoint
        c.header('Content-Location', `/guild/${guildId}`);
        return c.json(guild);
      });
    });
  })
  .get('/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
    const guildId = c.req.param('guildId');

    console.log(`🚀 ~ guild.ts ~ guildId:`, guildId);

    return getGuild(guildId, c.env).then((guild) => {
      if (!guild) {
        return c.json({ error: { message: 'Guild not found', status: 404 }, guildId }, 404);
      }

      return c.json(guild);
    });
  });
