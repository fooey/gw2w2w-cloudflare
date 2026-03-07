import { zValidator } from '@hono/zod-validator';
import type { WvWTeam } from '@service-api/definitions/wvw-teams';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getWvwTeam } from '@service-api/lib/resources/wvw/teams';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiWvwTeamsRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    return getWvwTeam('all', c.env).then((wvwTeams) => {
      if (!Array.isArray(wvwTeams)) {
        const payload: ErrorPayload = {
          message: 'WvW Team Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/teams',
        };
        return c.json(payload, payload.statusCode);
      }
      return c.json<WvWTeam[]>(wvwTeams);
    });
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
  .get('*', (c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/wvw/teams',
    };
    return c.json(payload, payload.statusCode);
  });
