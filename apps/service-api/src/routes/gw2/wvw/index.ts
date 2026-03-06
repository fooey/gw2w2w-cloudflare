import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { Hono } from 'hono';
import { apiWvwGuildsRoute } from './guilds';
import { apiWvwTeamsRoute } from './teams';

export const apiWvwRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/guilds', apiWvwGuildsRoute)
  .route('/teams', apiWvwTeamsRoute)
  .get('*', (c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/wvw',
    };
    return c.json(payload, payload.statusCode);
  });
