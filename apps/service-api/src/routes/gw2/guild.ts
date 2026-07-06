import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getGuildUpgrades, GuildUpgradeSchema } from '#lib/resources/guild/upgrades.ts';
import { getGuild, searchGuild } from '#lib/resources/guild.ts';
import { GuildSchema } from '#lib/types/Guild.ts';
import { isEmpty } from '@repo/utils';
import { Hono } from 'hono';
import { describeRoute, validator, resolver } from 'hono-openapi';
import { z } from 'zod';

export const apiGuildRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/upgrades',
    describeRoute({
      summary: 'Batch get guild upgrades',
      description:
        'Returns guild upgrade definitions for the given IDs. Proxied from [GW2 API v2/guild/upgrades](https://wiki.guildwars2.com/wiki/API:2/guild/upgrades).',
      tags: ['GW2 Guilds'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(GuildUpgradeSchema)) } },
          description: 'Array of guild upgrade objects',
        },
        404: { description: 'Not found' },
      },
    }),
    validator(
      'query',
      z.object({
        ids: z.string().transform((value, ctx) => {
          const segments = value.split(',');
          if (segments.some((id) => !/^[1-9]\d*$/u.test(id))) {
            ctx.addIssue({
              code: 'custom',
              message: 'ids must be a comma-separated list of positive integers',
            });
            return z.NEVER;
          }
          return segments.map(Number);
        }),
      }),
    ),
    async (c) => {
      const { ids } = c.req.valid('query');
      const upgrades = await getGuildUpgrades(ids, c.env);
      if (!upgrades) {
        const payload: ErrorPayload = {
          message: 'Guild Upgrades Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/guild/upgrades',
        };
        return c.json(payload, 404);
      }
      return withCacheJson(c, CACHE_TTL.patch.http, upgrades);
    },
  )
  .get(
    '/search',
    describeRoute({
      summary: 'Search guild by name',
      description:
        'Searches for a guild by name and returns guild details. Sets Content-Location header to the canonical guild endpoint. Proxied from [GW2 API v2/guild/search](https://wiki.guildwars2.com/wiki/API:2/guild/search).',
      tags: ['GW2 Guilds'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(GuildSchema) } },
          description: 'Guild object',
        },
        404: { description: 'Guild not found' },
      },
    }),
    validator('query', z.object({ name: z.string() })),
    async (c) => {
      const name = c.req.query('name')?.replaceAll('-', ' ');

      if (isEmpty(name)) {
        const payload: ErrorPayload = {
          message: 'Guild Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/guild',
        };
        return c.json(payload, 404);
      }

      const guildId = await searchGuild(name, c.env);
      if (isEmpty(guildId)) {
        const payload: ErrorPayload = {
          message: 'Guild Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/guild',
        };
        return c.json(payload, 404);
      }

      const guild = await getGuild(guildId, c.env);
      if (!guild) {
        const payload: ErrorPayload = {
          message: 'Guild Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/guild',
        };
        return c.json(payload, 404);
      }

      // Set canonical location header to the direct guild endpoint
      c.header('Content-Location', `/guilds/${guildId}`);
      return withCacheJson(c, CACHE_TTL.user.http, guild);
    },
  )
  .get(
    '/:guildId',
    describeRoute({
      summary: 'Get guild by ID',
      description:
        'Returns guild details including emblem specification. Proxied from [GW2 API v2/guild/:id](https://wiki.guildwars2.com/wiki/API:2/guild/:id).',
      tags: ['GW2 Guilds'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(GuildSchema) } },
          description: 'Guild object',
        },
        404: { description: 'Guild not found' },
      },
    }),
    validator('param', z.object({ guildId: z.string() })),
    async (c) => {
      const guildId = c.req.param('guildId');

      const guild = await getGuild(guildId, c.env);
      if (!guild) {
        const payload: ErrorPayload = {
          message: 'Guild Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/guild',
        };
        return c.json(payload, 404);
      }

      return withCacheJson(c, CACHE_TTL.user.http, guild);
    },
  );
