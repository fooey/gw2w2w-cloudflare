import { type CloudflareEnv } from '#index.ts';
import { type WvWMatchStripped } from '#lib/resources/wvw/matches.ts';
import { Hono } from 'hono';

export const apiWvwMatchesRoute = new Hono<{ Bindings: CloudflareEnv }>().get('/', async (c) => {
  const { results } = await c.env.WVW_DB.prepare('SELECT data FROM match_state ORDER BY match_id ASC').all<{
    data: string;
  }>();

  const matches = results.map((row) => JSON.parse(row.data) as WvWMatchStripped);

  return c.json(matches);
});
