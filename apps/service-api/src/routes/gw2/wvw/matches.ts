import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getWvWMatches, type WvWMatch } from '@service-api/lib/resources/wvw/matches';
import { Hono } from 'hono';
import { z } from 'zod';

const TEAM_COLORS = ['red', 'blue', 'green'] as const;

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const matches = await getWvWMatches('all', c.env);
    return c.json<WvWMatch[]>(matches, 200);
  })
  .get('/stats/teams', async (c) => {
    const matches = await getWvWMatches('all', c.env);
    const teamStats = matches.flatMap((match) =>
      TEAM_COLORS.map((color) => ({
        matchId: match.id,
        color,
        worldId: match.worlds[color],
        worldIds: match.all_worlds[color],
        score: match.scores[color],
        kills: match.kills[color],
        deaths: match.deaths[color],
        victoryPoints: match.victory_points[color],
      })),
    );
    return c.json(teamStats, 200);
  })
  .get('/:id', zValidator('param', z.object({ id: z.string() })), async (c) => {
    const id = c.req.param('id');
    const matches = await getWvWMatches(id, c.env);
    const match = matches[0];
    if (!match) {
      const payload: ErrorPayload = {
        message: 'WvW Match Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/matches',
      };
      return c.json(payload, 404);
    }
    return c.json<WvWMatch>(match, 200);
  });
