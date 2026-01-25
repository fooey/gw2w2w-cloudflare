import { emblemRoutes } from '@/routes/emblem';
import { gw2apiRoutes } from '@/routes/gw2api';
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
}

export type Bindings = {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
  EMBLEM_ASSETS: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(logger());
app.use('*', cors());
app.use('*', etag());
app.use(csrf());

app.get(
  '*',
  cache({
    cacheName: 'service-emblem',
    cacheControl: 'max-age=86400',
  }),
);

app.route('/emblem', emblemRoutes);
app.route('/gw2api', gw2apiRoutes);

app.get('*', (c) => {
  c.status(404);
  return c.json({
    message: 'Not Found!',
    status: 404,
    url: new URL(c.req.url).pathname,
  });
});

// EXPORT THE APP TYPE (Crucial for RPC)
export type AppType = typeof app;

// Default Export for Cloudflare
export default app;
