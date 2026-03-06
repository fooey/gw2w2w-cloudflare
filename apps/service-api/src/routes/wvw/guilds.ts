import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getWvwGuild } from '@service-api/lib/resources/wvw/guilds';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwGuildsRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/guild/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
    const guildId = c.req.param('guildId');

    return getWvwGuild(guildId, c.env).then((wvwGuilds) => {
      const [wvwGuild] = wvwGuilds || [];
      if (!wvwGuild) {
        const payload: ErrorPayload = {
          message: 'WvW Guild Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/guilds',
        };
        return c.json(payload, 404);
      }

      return c.json(wvwGuild);
    });
  })
  .get('*', (c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/wvw/guilds',
    };
    return c.json(payload, 404);
  });
