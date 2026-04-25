import { zValidator } from '@hono/zod-validator';
import { WVW_TEAMS } from '#definitions/index.ts';
import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getWvwGuild } from '#lib/resources/wvw/guilds.ts';
import { Hono } from 'hono';
import { z } from 'zod';

const regions = ['na', 'eu'] as const;

export const apiWvwGuildsRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/guild/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
    const guildId = c.req.param('guildId');

    const wvwGuilds = await getWvwGuild(guildId, c.env);
    const [wvwGuild] = wvwGuilds ?? [];
    if (!wvwGuild) {
      const payload: ErrorPayload = {
        message: 'WvW Guild Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/guilds',
      };
      return c.json(payload, 404);
    }

    return withCacheJson(c, CACHE_TTL.user.http, wvwGuild);
  })
  .get('/region/:region', zValidator('param', z.object({ region: z.enum(regions) })), async (c) => {
    const region = c.req.param('region');

    const wvwGuilds = await getWvwGuild('all', c.env);
    const regionGuilds = wvwGuilds?.filter((guild) => guild.region === region) ?? [];

    if (!Array.isArray(wvwGuilds)) {
      const payload: ErrorPayload = {
        message: 'WvW Guilds Not Found for Region',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/guilds',
      };
      return c.json(payload, 404);
    }

    return withCacheJson(c, CACHE_TTL.user.http, regionGuilds);
  })
  .get('/team/:teamId', zValidator('param', z.object({ teamId: z.enum(Object.keys(WVW_TEAMS)) })), async (c) => {
    const teamId = c.req.param('teamId');

    const wvwGuilds = await getWvwGuild('all', c.env);
    const teamGuilds = wvwGuilds?.filter((guild) => guild.teamId === teamId) ?? [];

    if (!Array.isArray(wvwGuilds)) {
      const payload: ErrorPayload = {
        message: 'WvW Guilds Not Found for Team',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/guilds',
      };
      return c.json(payload, 404);
    }

    return withCacheJson(c, CACHE_TTL.user.http, teamGuilds);
  });
