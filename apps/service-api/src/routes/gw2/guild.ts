import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getGuild, searchGuild } from '#lib/resources/guild.ts';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiGuildRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/search', zValidator('query', z.object({ name: z.string() })), async (c) => {
    const name = c.req.query('name')?.replace(/-/g, ' ');

    if (!name) {
      const payload: ErrorPayload = {
        message: 'Guild Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/guild',
      };
      return c.json(payload, 404);
    }

    const guildId = await searchGuild(name, c.env);
    if (!guildId) {
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
  })
  .get('/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
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
  });
