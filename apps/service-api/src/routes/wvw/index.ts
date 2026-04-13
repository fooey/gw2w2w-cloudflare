import { type CloudflareEnv } from '#index.ts';
import { Hono } from 'hono';
import { apiWvwEventsRoute } from './events';
import { apiWvwGuildsRoute } from './guilds';
import { apiWvwMatchesRoute } from './matches';

// matchId format: region-tier, e.g. "1-1" through "1-4" (NA) or "2-1" through "2-5" (EU)
const MATCH_ID_RE = /^\d-\d$/;

export const apiWvwRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/matches', apiWvwMatchesRoute)
  .route('/events', apiWvwEventsRoute)
  .route('/guilds', apiWvwGuildsRoute)
  .get('/stream', async (c) => {
    const matchId = c.req.query('matchId');

    if (!matchId) {
      return c.json({ error: 'matchId required' }, 400);
    }

    if (!MATCH_ID_RE.test(matchId)) {
      return c.json({ error: 'invalid matchId' }, 400);
    }

    // Forward to the DO's /subscribe handler.
    // The DO manages SSE connections directly — the Worker is just a thin proxy.
    const headers: HeadersInit = {};
    const lastEventId = c.req.header('last-event-id');
    if (lastEventId) headers['last-event-id'] = lastEventId;

    const stub = c.env.MATCHUP_POLLER.getByName('global');
    return stub.fetch(new Request(`https://internal/subscribe?matchId=${encodeURIComponent(matchId)}`, { headers }));
  });
