import colorRoute from '@/routes/color';
import emblemRoute from '@/routes/emblem';
import guildRoute from '@/routes/guild';
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
}

const app = new Hono<{ Bindings: CloudflareEnv }>()
  .use(logger())
  .use('*', cors())
  // .use('*', etag())
  .use(csrf())
  // .get(
  //   '*',
  //   cache({
  //     cacheName: 'service-gw2api',
  //     cacheControl: 'max-age=86400',
  //   }),
  // )
  .route('/gw2api/guild', guildRoute)
  .route('/gw2api/color', colorRoute)
  .route('/gw2api/emblem', emblemRoute)
  .get('/gw2api', (c) => c.json({ message: 'API Root', status: 200 }))
  .get('*', (c) => {
    c.status(404);
    return c.json({
      message: 'Not Found',
      status: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-gw2api',
    });
  });

// EXPORT THE APP TYPE (Crucial for RPC)
export type AppType = typeof app;

// Default Export for Cloudflare
export default app;
