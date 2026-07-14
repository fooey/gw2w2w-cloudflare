import { Hono } from 'hono';
import { describeRoute, validator, resolver } from 'hono-openapi';
import { z } from 'zod';

import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { WvWMatchSchema, getWvWMatchByWorld, getWvWMatches } from '#lib/resources/wvw/matches.ts';

const TEAM_COLORS = ['red', 'blue', 'green'] as const;

const WvWTeamStatsSchema = z
  .object({
    matchId: z.string().describe('Match ID in region-number format (e.g. "1-1")'),
    color: z.enum(['red', 'blue', 'green']).describe('Team colour slot in this match'),
    worldId: z.number().describe('Primary linked world ID for this team'),
    worldIds: z.array(z.number()).describe('All world IDs linked to this team, including guest worlds'),
    score: z.number().describe('Current map score for this team'),
    kills: z.number().describe('Total kills across all maps for this team'),
    deaths: z.number().describe('Total deaths across all maps for this team'),
    victoryPoints: z.number().describe('Cumulative victory points for this team'),
  })
  .describe('Flattened per-team stats for a single team slot within a WvW match');

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List all WvW matches',
      description:
        'Returns all active WvW matches with scores, kills, deaths, and world assignments. Proxied from [GW2 API v2/wvw/matches](https://wiki.guildwars2.com/wiki/API:2/wvw/matches), R2-cached for up to 5 minutes. ' +
        'For gw2w2w.com-facing use cases, prefer `/wvw/matches` — it reads from the ~20s-fresh D1 store the match poller already maintains, with no live GW2 API round-trip. This endpoint remains for consumers that specifically need a direct pass-through to the GW2 API.',
      tags: ['GW2 WvW Matches'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(WvWMatchSchema)) } },
          description: 'Array of WvW match objects',
        },
      },
    }),
    async (c) => {
      const matches = await getWvWMatches('all', c.env);
      return withCacheJson(c, CACHE_TTL.live.http, matches);
    },
  )
  .get(
    '/stats/teams',
    describeRoute({
      summary: 'Get team stats for all matches',
      description:
        'Returns flattened per-team stats (scores, kills, deaths, victory points) for all active matches. Proxied from [GW2 API v2/wvw/matches](https://wiki.guildwars2.com/wiki/API:2/wvw/matches).',
      tags: ['GW2 WvW Matches'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(WvWTeamStatsSchema)) } },
          description: 'Array of team stat objects',
        },
      },
    }),
    async (c) => {
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
    },
  )
  .get(
    '/:id',
    describeRoute({
      summary: 'Get WvW match by ID',
      description:
        'Returns a single WvW match by ID (format: `region-tier`, e.g. `1-1`). Proxied from [GW2 API v2/wvw/matches](https://wiki.guildwars2.com/wiki/API:2/wvw/matches), R2-cached for up to 5 minutes. ' +
        'For gw2w2w.com-facing use cases, prefer `/wvw/matches/:id` — it reads from the ~20s-fresh D1 store the match poller already maintains, with no live GW2 API round-trip. This endpoint remains for consumers that specifically need a direct pass-through to the GW2 API.',
      tags: ['GW2 WvW Matches'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(WvWMatchSchema) } },
          description: 'WvW match object',
        },
        404: { description: 'Not found' },
      },
    }),
    validator('param', z.object({ id: z.string() })),
    async (c) => {
      const id = c.req.param('id');
      const matches = await getWvWMatches(id, c.env);
      const [match] = matches;
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
    },
  )
  .get(
    '/world/:worldId',
    describeRoute({
      summary: 'Get WvW match by world ID',
      description:
        'Finds the current WvW match that a given world is participating in. Proxied from [GW2 API v2/wvw/matches](https://wiki.guildwars2.com/wiki/API:2/wvw/matches), R2-cached for up to 5 minutes. ' +
        'For gw2w2w.com-facing use cases, prefer `/wvw/matches/world/:worldId` — it reads from the ~20s-fresh D1 store the match poller already maintains, with no live GW2 API round-trip. This endpoint remains for consumers that specifically need a direct pass-through to the GW2 API.',
      tags: ['GW2 WvW Matches'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(WvWMatchSchema) } },
          description: 'WvW match object',
        },
        404: { description: 'Not found' },
      },
    }),
    validator('param', z.object({ worldId: z.coerce.number().int().positive() })),
    async (c) => {
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
    },
  );
