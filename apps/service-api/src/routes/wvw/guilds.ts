import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv } from '@service-api/index';
import { getWvwGuild } from '@service-api/lib/resources/wvw/guilds';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwGuildsRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/guild/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
    const guildId = c.req.param('guildId');

    return getWvwGuild(guildId, c.env).then((wvwGuilds) => {
      if (!wvwGuilds || (Array.isArray(wvwGuilds) && wvwGuilds.length !== 1)) {
        c.status(404);
        return c.json(
          {
            error: {
              message: 'Guild not found',
              status: 404,
              url: new URL(c.req.url).pathname,
              service: 'service-api/wvw/guilds/guild/:guildId',
            },
            guildId,
          },
          404,
        );
      }

      return c.json(wvwGuilds[0]);
    });
  })
  .get('*', (c) => {
    c.status(404);
    return c.json({
      message: 'Not Found',
      status: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/wvw/guilds',
    });
  });
