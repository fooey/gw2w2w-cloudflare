import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';

import { isEmpty, isNonEmptyString } from '@repo/utils';

import type { CloudflareEnv } from '#index.ts';
import { getGw2Health } from '#lib/resources/gw2Fetch.ts';

import { apiWvwEventsRoute } from './events';
import { apiWvwGuildsRoute } from './guilds';
import { apiWvwMatchesRoute } from './matches';

// matchId format: region-tier, e.g. "1-1" through "1-4" (NA) or "2-1" through "2-5" (EU)
const MATCH_ID_RE = /^\d-\d$/u;
// A touch above the health-check cron's own 90s cooldown, so a single delayed poll
// doesn't get flagged stale before the poller itself has had a fair chance to recover.
const POLL_STALE_THRESHOLD_MS = 90_000;

interface PollerStatus {
  lastSuccessfulPollAt: string | null;
  [key: string]: unknown;
}

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
      const pollerResponse = await stub.fetch(new Request('https://internal/status'));
      // The DO's own /status handler builds this shape — trusted, not external input.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion
      const pollerStatus = (await pollerResponse.json()) as PollerStatus;
      const health = await getGw2Health(c.env);
      const pollIsStale =
        !isNonEmptyString(pollerStatus.lastSuccessfulPollAt) ||
        Date.now() - new Date(pollerStatus.lastSuccessfulPollAt).getTime() > POLL_STALE_THRESHOLD_MS;

      return c.json({ ...pollerStatus, ...health, pollIsStale });
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
