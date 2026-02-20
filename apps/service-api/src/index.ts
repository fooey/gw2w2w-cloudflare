import { apiColorRoute } from '@service-api/routes/color';
import { apiEmblemRoute } from '@service-api/routes/emblem';
import { apiGuildRoute } from '@service-api/routes/guild';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
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
  .use('*', cors())
  // .use('*', etag())
  .use(csrf())
  // .get(
  //   '*',
  //   cache({
  //     cacheName: 'service-api',
  //     cacheControl: 'max-age=86400',
  //   }),
  // )
  .route('/emblem', apiEmblemRoute)
  .route('/guild', apiGuildRoute)
  .route('/color', apiColorRoute)
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
