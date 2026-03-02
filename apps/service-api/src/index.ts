import { allowedCsrf, allowedOrigin } from '@repo/utils';
import { apiColorRoute } from '@service-api/routes/color';
import { apiEmblemRoute } from '@service-api/routes/emblem';
import { apiGuildRoute } from '@service-api/routes/guild';
import { apiWvwRoute } from '@service-api/routes/wvw';
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';

export interface ErrorPayload {
  message: string;
  status: number;
}

export interface CloudflareEnv {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
  EMBLEM_ASSETS: R2Bucket;
  GW2_API_BASE: string;
  GW2_API_KEY?: string;
}

const app = new Hono<{ Bindings: CloudflareEnv }>()
  .use(logger())
  .use('*', etag())
  .use(
    '*',
    cors({
      origin: (origin, c) => allowedOrigin(origin, c.req.header('host')),
    }),
  )
  .use(
    csrf({
      origin: (origin, c) => allowedCsrf(origin, c.req.header('host')),
    }),
  )
  .get(
    '*',
    cache({
      cacheName: 'service-api',
      cacheControl: 'max-age=86400',
    }),
  )
  .route('/emblem', apiEmblemRoute)
  .route('/guild', apiGuildRoute)
  .route('/color', apiColorRoute)
  .route('/wvw', apiWvwRoute)
  .get('*', (c) => {
    c.status(404);
    return c.json({
      message: 'Not Found',
      status: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api',
    });
  });

// EXPORT THE APP TYPE (Crucial for RPC)
export type ServiceApiAppType = typeof app;

// Default Export for Cloudflare
export default app;
