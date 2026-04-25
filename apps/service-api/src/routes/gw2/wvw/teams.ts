import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { getWvwTeam } from '#lib/resources/wvw/teams.ts';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwTeamsRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const wvwTeams = await getWvwTeam('all', c.env);
    if (!Array.isArray(wvwTeams)) {
      const payload: ErrorPayload = {
        message: 'WvW Team Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/teams',
      };
      return c.json(payload, 404);
    }
    return withCacheJson(c, CACHE_TTL.user.http, wvwTeams);
  })
  .get('/team/:teamId', zValidator('param', z.object({ teamId: z.string() })), async (c) => {
    const teamId = c.req.param('teamId');

    const wvwTeams = await getWvwTeam(teamId, c.env);
    const [wvwTeam] = wvwTeams ?? [];
    if (!wvwTeam) {
      const payload: ErrorPayload = {
        message: 'WvW Team Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/teams',
      };
      return c.json(payload, 404);
    }

    return withCacheJson(c, CACHE_TTL.user.http, wvwTeam);
  });
