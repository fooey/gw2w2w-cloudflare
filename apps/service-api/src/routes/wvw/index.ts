import type { CloudflareEnv } from '#index.ts';
import { isEmpty, isNonEmptyString } from '@repo/utils';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { apiWvwEventsRoute } from './events';
import { apiWvwGuildsRoute } from './guilds';
import { apiWvwMatchesRoute } from './matches';

// matchId format: region-tier, e.g. "1-1" through "1-4" (NA) or "2-1" through "2-5" (EU)
const MATCH_ID_RE = /^\d-\d$/u;

export const apiWvwRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/matches', apiWvwMatchesRoute)
  .route('/events', apiWvwEventsRoute)
  .route('/guilds', apiWvwGuildsRoute)
  .get(
    '/stream/status',
    describeRoute({
      summary: 'Get stream poller status',
      description: 'Returns the current status of the WvW match poller Durable Object.',
      tags: ['WvW Stream'],
      responses: { 200: { description: 'Poller status object' } },
    }),
    async (c) => {
      const stub = c.env.MATCHUP_POLLER.getByName('global');
      return stub.fetch(new Request('https://internal/status'));
    },
  )
  .get(
    '/stream',
    describeRoute({
      summary: 'Subscribe to WvW match events',
      description: 'Opens an SSE stream for real-time WvW match updates. Requires a matchId query parameter.',
      tags: ['WvW Stream'],
      responses: {
        200: { description: 'SSE event stream' },
        400: { description: 'Invalid or missing matchId' },
      },
    }),
    async (c) => {
      const matchId = c.req.query('matchId');

      if (isEmpty(matchId)) {
        return c.json({ error: 'matchId required' }, 400);
      }

      if (!MATCH_ID_RE.test(matchId)) {
        return c.json({ error: 'invalid matchId' }, 400);
      }

      // Forward to the DO's /subscribe handler.
      // The DO manages SSE connections directly — the Worker is just a thin proxy.
      const headers: HeadersInit = {};
      const lastEventId = c.req.header('last-event-id');
      if (isNonEmptyString(lastEventId)) headers['last-event-id'] = lastEventId;

      const stub = c.env.MATCHUP_POLLER.getByName('global');
      return stub.fetch(
        new Request(`https://internal/subscribe?matchId=${encodeURIComponent(matchId)}`, {
          headers,
        }),
      );
    },
  );
