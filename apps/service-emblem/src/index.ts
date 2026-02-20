import { serviceEmblemRoute } from '@service-emblem/routes/emblem';
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
  SERVICE_API: Fetcher;
}

const app = new Hono<{ Bindings: CloudflareEnv }>()
  .use(logger())
  .use('*', cors())
  // .use('*', etag())
  .use(csrf())
  // .get(
  //   '*',
  //   cache({
  //     cacheName: 'service-emblem',
  //     cacheControl: 'max-age=86400',
  //   }),
  // )
  .route('/', serviceEmblemRoute)
  .get('*', (c) => {
    c.status(404);
    return c.json({
      message: 'Not Found!',
      status: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-emblem',
    });
  });

// EXPORT THE APP TYPE (Crucial for RPC)
export type ServiceEmblemAppType = typeof app;

// Default Export for Cloudflare
export default app;
