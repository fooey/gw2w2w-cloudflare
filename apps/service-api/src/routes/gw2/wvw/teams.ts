import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '@service-api/index';
import { withCacheJson } from '@service-api/lib/cache-providers/cf-cache';
import { CACHE_TTL } from '@service-api/lib/resources/constants';
import { getWvwTeamGuilds } from '@service-api/lib/resources/wvw/team-guilds';
import { getWvwTeam } from '@service-api/lib/resources/wvw/teams';
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
  })
  .get('/team/:teamId/guilds', zValidator('param', z.object({ teamId: z.string() })), async (c) => {
    const teamId = c.req.param('teamId');
    const guilds = await getWvwTeamGuilds(teamId, c.env);

    return withCacheJson(c, CACHE_TTL.user.http, guilds);
  });
