import { type CloudflareEnv } from '#index.ts';
import { getDb } from '#db/index.ts';
import { matchState } from '#db/schema.ts';
import { asc } from 'drizzle-orm';
import { Hono } from 'hono';

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>().get('/', async (c) => {
  const db = getDb(c.env.WVW_DB);
  const rows = await db.select({ data: matchState.data }).from(matchState).orderBy(asc(matchState.match_id));
  return c.json(rows.map((r) => r.data));
});
