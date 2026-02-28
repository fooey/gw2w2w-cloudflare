import { allowedCsrf, allowedOrigin } from '@repo/utils/routing/security';
import { serviceEmblemRoute } from '@service-emblem/routes/emblem';
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
  SERVICE_API: Fetcher;
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
  .get('*', cache({ cacheName: 'service-emblem', cacheControl: 'max-age=86400' }))
  .get('*', async (c, next) => {
    const host = c.req.header('host');

    if (host === 'guilds.gw2w2w.com') {
      return c.redirect('https://gw2w2w.com', 302);
    }

    return next();
  })
  .get('/favicon.ico', (c) => c.redirect('/97C007DC-87D5-E311-9621-AC162DAE8ACD', 302))
  .get('/guilds/*', (c) => {
    const rest = c.req.path.replace(/^\/guilds/, '') || '/';

    return c.redirect(rest, 308);
  })
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
