import type { CloudflareEnv } from '#index.ts';
import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { apiColorRoute } from './color';
import { apiEmblemRoute } from './emblem';
import { apiGuildRoute } from './guild';
import { apiWvwRoute } from './wvw';

export const apiGw2Route = new Hono<{ Bindings: CloudflareEnv }>()
  .use('*', etag())
  .route('/emblem', apiEmblemRoute)
  .route('/guild', apiGuildRoute)
  .route('/color', apiColorRoute)
  .route('/wvw', apiWvwRoute);
// .get('*', (c) => {
//   const payload: ErrorPayload = {
//     message: 'Not Found',
//     statusCode: 404,
//     url: new URL(c.req.url).pathname,
//     service: 'service-api/gw2',
//   };
//   return c.json(payload, payload.statusCode);
// });
