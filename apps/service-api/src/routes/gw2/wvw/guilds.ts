import { zValidator } from '@hono/zod-validator';
import { WVW_TEAMS } from '@service-api/definitions';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getWvwGuild, type WvWGuild } from '@service-api/lib/resources/wvw/guilds';
import { Hono } from 'hono';
import { z } from 'zod';

const regions = ['na', 'eu'] as const;

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

      return c.json<WvWGuild>(wvwGuild);
    });
  })
  .get('/region/:region', zValidator('param', z.object({ region: z.enum(regions) })), async (c) => {
    const region = c.req.param('region');

    return getWvwGuild('all', c.env).then((wvwGuilds) => {
      const regionGuilds = wvwGuilds?.filter((guild) => guild.region === region) || [];

      if (!Array.isArray(wvwGuilds)) {
        const payload: ErrorPayload = {
          message: 'WvW Guilds Not Found for Region',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/guilds',
        };
        return c.json(payload, 404);
      }

      return c.json<WvWGuild[]>(regionGuilds);
    });
  })
  .get('/team/:teamId', zValidator('param', z.object({ teamId: z.enum(Object.keys(WVW_TEAMS)) })), async (c) => {
    const teamId = c.req.param('teamId');

    return getWvwGuild('all', c.env).then((wvwGuilds) => {
      const teamGuilds = wvwGuilds?.filter((guild) => guild.teamId === teamId) || [];

      if (!Array.isArray(wvwGuilds)) {
        const payload: ErrorPayload = {
          message: 'WvW Guilds Not Found for Team',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/guilds',
        };
        return c.json(payload, 404);
      }

      return c.json<WvWGuild[]>(teamGuilds);
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
