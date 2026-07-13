import { Hono } from 'hono';

import type { CloudflareEnv } from '#index.ts';

import { apiWvwEventsRoute } from './events';
import { apiWvwGuildsRoute } from './guilds';
import { apiWvwMatchesRoute } from './matches';
import { apiWvwStreamRoute } from './stream';

export const apiWvwRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/matches', apiWvwMatchesRoute)
  .route('/events', apiWvwEventsRoute)
  .route('/guilds', apiWvwGuildsRoute)
  .route('/stream', apiWvwStreamRoute);
