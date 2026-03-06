import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { apiWvwGuildsRoute } from '@service-api/routes/wvw/guilds';
import { apiWvwTeamsRoute } from '@service-api/routes/wvw/teams';
import { Hono } from 'hono';

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
