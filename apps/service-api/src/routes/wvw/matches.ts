import { asc } from 'drizzle-orm';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';

import type { CloudflareEnv } from '#index.ts';
import { getDb } from '#db/index.ts';
import { matchState } from '#db/schema.ts';
import { WvWMatchSchema } from '#lib/resources/wvw/matches.ts';

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
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
);
