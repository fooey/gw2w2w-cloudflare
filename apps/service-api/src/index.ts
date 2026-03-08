import { allowedCsrf, allowedOrigin } from '@repo/utils';
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
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

// Pure routes chain — only for the RPC type export (no middleware contamination)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = new Hono<{ Bindings: CloudflareEnv }>().route('/gw2', apiGw2Route);

export type ServiceApiAppType = typeof routes;

// Full runtime app — has middleware + same routes
const app = new Hono<{ Bindings: CloudflareEnv }>()
  .use(logger())
  .use('*', etag())
  .use('*', cors({ origin: (origin, c) => allowedOrigin(origin, c.req.header('host')) }))
  .use(csrf({ origin: (origin, c) => allowedCsrf(origin, c.req.header('host')) }))
  .get('*', cache({ cacheName: 'service-api', cacheControl: 'max-age=86400' }))
  .route('/gw2', apiGw2Route);

export default app;
