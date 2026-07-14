import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';

import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import type { WvWMatch } from '#lib/resources/wvw/matches.ts';
import { getDb } from '#db/index.ts';
import { matchState } from '#db/schema.ts';
import { WvWMatchSchema } from '#lib/resources/wvw/matches.ts';

export function findMatchByWorld(matches: WvWMatch[], worldId: number): WvWMatch | null {
  return (
    matches.find(
      (m) =>
        m.all_worlds.red.includes(worldId) ||
        m.all_worlds.blue.includes(worldId) ||
        m.all_worlds.green.includes(worldId),
    ) ?? null
  );
}

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List current WvW match states',
      description: 'Returns the latest cached match state for all active WvW matches from the database.',
      tags: ['WvW Matches'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(WvWMatchSchema)) } },
          description: 'Array of match state objects',
        },
      },
    }),
    async (c) => {
      const db = getDb(c.env.WVW_DB);
      const rows = await db.select({ data: matchState.data }).from(matchState).orderBy(asc(matchState.match_id));
      return c.json(rows.map((r) => r.data));
    },
  )
  .get(
    '/:id',
    describeRoute({
      summary: 'Get WvW match by ID',
      description:
        'Returns a single cached WvW match state by ID (format: `region-tier`, e.g. `1-1`) from the database — refreshed every ~20s by the match poller.',
      tags: ['WvW Matches'],
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
      const { id } = c.req.valid('param');
      const db = getDb(c.env.WVW_DB);
      const rows = await db
        .select({ data: matchState.data })
        .from(matchState)
        .where(eq(matchState.match_id, id))
        .limit(1);
      const match = rows[0]?.data;
      if (!match) {
        const payload: ErrorPayload = {
          message: 'WvW Match Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/matches',
        };
        return c.json(payload, 404);
      }
      return c.json(match);
    },
  )
  .get(
    '/world/:worldId',
    describeRoute({
      summary: 'Get WvW match by world ID',
      description:
        'Finds the cached WvW match state that a given world is currently participating in, from the database.',
      tags: ['WvW Matches'],
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
      const db = getDb(c.env.WVW_DB);
      // worldId lives inside the JSON `data` blob, not a column — with only 9 matches total
      // (NA tiers 1-4, EU tiers 1-5), fetching all rows and filtering in JS is simpler and
      // cheaper than a json_each/json_extract query for a table this small.
      const rows = await db.select({ data: matchState.data }).from(matchState);
      const match = findMatchByWorld(
        rows.map((r) => r.data),
        worldId,
      );
      if (!match) {
        const payload: ErrorPayload = {
          message: 'WvW Match Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/matches',
        };
        return c.json(payload, 404);
      }
      return c.json(match);
    },
  );
