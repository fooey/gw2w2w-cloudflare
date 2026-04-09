import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getGuild, searchGuild } from '#lib/resources/guild.ts';
import { type Guild } from '#lib/types/index.ts';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiGuildRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', zValidator('query', z.object({ ids: z.string().min(1) })), async (c) => {
    const rawIds = c.req.query('ids') ?? '';
    const ids = rawIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 200);

    if (ids.length === 0) {
      const payload: ErrorPayload = {
        message: 'No Guild IDs provided',
        statusCode: 400,
        url: new URL(c.req.url).pathname,
        service: 'service-api/guild',
      };
      return c.json(payload, 400);
    }

    const results = await Promise.all(ids.map((id) => getGuild(id, c.env)));
    const guilds = results.filter((g): g is Guild => g != null);

    return withCacheJson(c, CACHE_TTL.user.http, guilds);
  })
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
