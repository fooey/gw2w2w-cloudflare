import type { CloudflareEnv } from '@service-api/index';
import { apiWvwGuildsRoute } from '@service-api/routes/wvw/guilds';
import { apiWvwTeamsRoute } from '@service-api/routes/wvw/teams';
import { Hono } from 'hono';

export const apiWvwRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/guilds', apiWvwGuildsRoute)
  .route('/teams', apiWvwTeamsRoute)
  .get('*', (c) => {
    c.status(404);
    return c.json({
      message: 'Not Found',
      status: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/wvw',
    });
  });
