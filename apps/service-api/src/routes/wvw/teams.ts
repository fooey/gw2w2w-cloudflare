import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv } from '@service-api/index';
import { getWvwTeam } from '@service-api/lib/resources/wvw/teams';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwTeamsRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('', async (c) => {
    return getWvwTeam('all', c.env).then((wvwTeams) => {
      return c.json(wvwTeams);
    });
  })
  .get('/team/:teamId', zValidator('param', z.object({ teamId: z.string() })), async (c) => {
    const teamId = c.req.param('teamId');

    return getWvwTeam(teamId, c.env).then((wvwTeams) => {
      if (!wvwTeams || (Array.isArray(wvwTeams) && wvwTeams.length !== 1)) {
        c.status(404);
        return c.json(
          {
            error: {
              message: 'Team not found',
              status: 404,
              url: new URL(c.req.url).pathname,
              service: 'service-api/wvw/teams/team/:teamId',
            },
            teamId,
          },
          404,
        );
      }

      return c.json(wvwTeams[0]);
    });
  })
  .get('*', (c) => {
    c.status(404);
    return c.json({
      message: 'Not Found',
      status: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/wvw/teams',
    });
  });
