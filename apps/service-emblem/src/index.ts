import { allowedCsrf, allowedOrigin } from '@repo/utils/routing/security';
import { serviceEmblemRoute } from '@service-emblem/routes/emblem';
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

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
    secureHeaders({
      crossOriginResourcePolicy: 'cross-origin', // Required for serving images to other origins
    }),
  )
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
  .use('*', (c, next) => {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    return next();
  })
  .get('*', cache({ cacheName: 'service-emblem', cacheControl: 'max-age=86400' }))
  .get('*', async (c, next) => {
    const host = c.req.header('host');

    if (host === 'guilds.gw2w2w.com') {
      const url = new URL(c.req.url);
      url.host = 'emblem.gw2w2w.com';
      return c.redirect(url.toString(), 302);
    }

    return next();
  })
  .get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /\n'))
  .get('/favicon.ico', (c) => c.redirect('/97C007DC-87D5-E311-9621-AC162DAE8ACD', 302))
  .get('/guilds/*', (c) => {
    const url = new URL(c.req.url);
    url.host = 'gw2w2w.com';
    url.protocol = 'https:';
    return c.redirect(url.toString(), 308);
  })
  .get('/short/:guildId', (c) => {
    const { guildId } = c.req.param();
    return c.redirect(`/${guildId}`, 308);
  })
  .route('/', serviceEmblemRoute);

app.notFound((c) => c.json({ error: { message: 'Not Found', status: 404 } }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { message: 'Internal Server Error', status: 500 } }, 500);
});

// EXPORT THE APP TYPE (Crucial for RPC)
export type ServiceEmblemAppType = typeof app;

// Default Export for Cloudflare
export default app;
