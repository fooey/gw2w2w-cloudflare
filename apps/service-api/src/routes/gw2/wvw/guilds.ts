import { Hono } from 'hono';
import { describeRoute, validator, resolver } from 'hono-openapi';
import { z } from 'zod';

import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { WVW_TEAMS } from '#definitions/index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { WvWGuildSchema, getWvwGuild } from '#lib/resources/wvw/guilds.ts';

const regions = ['na', 'eu'] as const;

export const apiWvwGuildsRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/guild/:guildId',
    describeRoute({
      summary: 'Get WvW guild by ID',
      description:
        'Returns WvW participation data for a specific guild. Proxied from [GW2 API v2/wvw/matches](https://wiki.guildwars2.com/wiki/API:2/wvw/matches).',
      tags: ['GW2 WvW Guilds'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(WvWGuildSchema) } },
          description: 'WvW guild object',
        },
        404: { description: 'Not found' },
      },
    }),
    validator('param', z.object({ guildId: z.string() })),
    async (c) => {
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
    },
  )
  .get(
    '/region/:region',
    describeRoute({
      summary: 'List WvW guilds by region',
      description:
        'Returns all WvW guilds in a region (na or eu). Proxied from [GW2 API v2/wvw/matches](https://wiki.guildwars2.com/wiki/API:2/wvw/matches).',
      tags: ['GW2 WvW Guilds'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(WvWGuildSchema)) } },
          description: 'Array of WvW guild objects',
        },
        404: { description: 'Not found' },
      },
    }),
    validator('param', z.object({ region: z.enum(regions) })),
    async (c) => {
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
    },
  )
  .get(
    '/team/:teamId',
    describeRoute({
      summary: 'List WvW guilds by team',
      description:
        'Returns all WvW guilds on a specific team. Proxied from [GW2 API v2/wvw/matches](https://wiki.guildwars2.com/wiki/API:2/wvw/matches).',
      tags: ['GW2 WvW Guilds'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(WvWGuildSchema)) } },
          description: 'Array of WvW guild objects',
        },
        404: { description: 'Not found' },
      },
    }),
    validator('param', z.object({ teamId: z.enum(Object.keys(WVW_TEAMS)) })),
    async (c) => {
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
    },
  );
