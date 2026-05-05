import type { CloudflareEnv } from '#index.ts';
import { getDb } from '#db/index.ts';
import { matchState } from '#db/schema.ts';
import { asc } from 'drizzle-orm';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
  '/',
  describeRoute({
    summary: 'List current WvW match states',
    description: 'Returns the latest cached match state for all active WvW matches from the database.',
    tags: ['WvW Matches'],
    responses: { 200: { description: 'Array of match state objects' } },
  }),
  async (c) => {
    const db = getDb(c.env.WVW_DB);
    const rows = await db.select({ data: matchState.data }).from(matchState).orderBy(asc(matchState.match_id));
    return c.json(rows.map((r) => r.data));
  },
);
