import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { Hono } from 'hono';
import { apiColorRoute } from './color';
import { apiEmblemRoute } from './emblem';
import { apiGuildRoute } from './guild';
import { apiWvwRoute } from './wvw';

export const apiGw2Route = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/emblem', apiEmblemRoute)
  .route('/guild', apiGuildRoute)
  .route('/color', apiColorRoute)
  .route('/wvw', apiWvwRoute)
  .get('*', (c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/gw2',
    };
    return c.json(payload, payload.statusCode);
  });
