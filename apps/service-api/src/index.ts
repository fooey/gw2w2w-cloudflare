import { allowedCsrf, allowedOrigin } from '@repo/utils';
import { Hono, type MiddlewareHandler } from 'hono';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { STORE_OBJECT_TTL, STORE_STATIC_OBJECT_TTL, withJitter } from './lib/resources/constants';
import { apiGw2Route } from './routes/gw2';

export interface ErrorPayload {
  message: string;
  statusCode: ContentfulStatusCode;
  url: string;
  service: string;
}

export interface CloudflareEnv {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
  EMBLEM_ASSETS: R2Bucket;
  GW2_API_BASE: string;
  GW2_API_KEY?: string;
}

const staticCache = cache({ cacheName: 'service-api', cacheControl: `max-age=${STORE_STATIC_OBJECT_TTL}` });
const defaultCache: MiddlewareHandler = (c, next) =>
  cache({ cacheName: 'service-api', cacheControl: `max-age=${withJitter(STORE_OBJECT_TTL)}` })(c, next);

const app = new Hono<{ Bindings: CloudflareEnv }>()
  .use(logger())
  .use('*', etag())
  .use('*', secureHeaders())
  .use('*', cors({ origin: (origin, c) => allowedOrigin(origin, c.req.header('host')) }))
  .use(csrf({ origin: (origin, c) => allowedCsrf(origin, c.req.header('host')) }))
  .use('*', (c, next) => {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    return next();
  })
  .get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /\n'))
  .get('/favicon.ico', (c) => c.newResponse(null, 404))
  .get('/gw2/color/*', staticCache)
  .get('/gw2/emblem/*', staticCache)
  .get('*', defaultCache)
  .route('/gw2', apiGw2Route);

app.notFound((c) => {
  const payload: ErrorPayload = {
    message: 'Not Found',
    statusCode: 404,
    url: new URL(c.req.url).pathname,
    service: 'service-api',
  };
  return c.json(payload, payload.statusCode);
});

app.onError((err, c) => {
  console.error(err);
  const payload: ErrorPayload = {
    message: 'Internal Server Error',
    statusCode: 500,
    url: new URL(c.req.url).pathname,
    service: 'service-api',
  };
  return c.json(payload, payload.statusCode);
});

export type ServiceApiAppType = typeof app;
export default app;
