import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv, type ErrorPayload } from '@service-api/index';
import { withCacheJson } from '@service-api/lib/cache-providers/cf-cache';
import { CACHE_TTL } from '@service-api/lib/resources/constants';
import { getWvWMatchByWorld, getWvWMatches } from '@service-api/lib/resources/wvw/matches';
import { Hono } from 'hono';
import { z } from 'zod';

const TEAM_COLORS = ['red', 'blue', 'green'] as const;

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', async (c) => {
    const matches = await getWvWMatches('all', c.env);
    return withCacheJson(c, CACHE_TTL.live.http, matches);
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
    return withCacheJson(c, CACHE_TTL.live.http, teamStats);
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
    return withCacheJson(c, CACHE_TTL.live.http, match);
  })
  .get('/world/:worldId', zValidator('param', z.object({ worldId: z.coerce.number().int().positive() })), async (c) => {
    const { worldId } = c.req.valid('param');
    const match = await getWvWMatchByWorld(worldId, c.env);
    if (!match) {
      const payload: ErrorPayload = {
        message: 'WvW Match Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/wvw/matches',
      };
      return c.json(payload, 404);
    }
    return withCacheJson(c, CACHE_TTL.live.http, match);
  });
