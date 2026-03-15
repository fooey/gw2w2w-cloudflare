import { zValidator } from '@hono/zod-validator';
import type { WvWTeam } from '@service-api/definitions/wvw-teams';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import type { Guild } from '@service-api/lib/types';
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
    return c.json<WvWTeam[]>(wvwTeams, 200);
  })
  .get('/team/:teamId', zValidator('param', z.object({ teamId: z.string() })), async (c) => {
    const teamId = c.req.param('teamId');

    return getWvwTeam(teamId, c.env).then((wvwTeams) => {
      const [wvwTeam] = wvwTeams || [];
      if (!wvwTeam) {
        const payload: ErrorPayload = {
          message: 'WvW Team Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/teams',
        };
        return c.json(payload, 404);
      }

      return c.json<WvWTeam>(wvwTeam);
    });
  })
  .get('/team/:teamId/guilds', zValidator('param', z.object({ teamId: z.string() })), async (c) => {
    const teamId = c.req.param('teamId');
    const guilds = await getWvwTeamGuilds(teamId, c.env);
    return c.json<Guild[]>(guilds, 200);
  });
// .get('*', (c) => {
//   const payload: ErrorPayload = {
//     message: 'Not Found',
//     statusCode: 404,
//     url: new URL(c.req.url).pathname,
//     service: 'service-api/wvw/teams',
//   };
//   return c.json(payload, payload.statusCode);
// });
