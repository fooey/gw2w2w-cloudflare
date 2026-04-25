import { allowedCsrf, allowedOrigin } from '@repo/utils';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { checkBuildId, warmStaticCaches } from './cron/buildWatcher';
import { MatchupPoller } from './durable-objects/MatchupPoller';
import { GW2RateLimitError } from './lib/resources/api';
import { apiGw2Route } from './routes/gw2';
import { apiWvwRoute } from './routes/wvw';

export { MatchupPoller };

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
  WVW_DB: D1Database;
  MATCHUP_POLLER: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: CloudflareEnv }>()
  .use(logger())
  .use('*', async (c, next) => {
    await next();
    c.header('Vary', 'Origin', { append: true });
  })
  .use('*', secureHeaders())
  .use('*', cors({ origin: (origin, c) => allowedOrigin(origin, c.req.header('host')) }))
  .use(csrf({ origin: (origin, c) => allowedCsrf(origin, c.req.header('host')) }))
  .use('*', (c, next) => {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    return next();
  })
  .get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /\n'))
  .get('/favicon.ico', (c) => c.newResponse(null, 404))
  .route('/gw2', apiGw2Route)
  .route('/wvw', apiWvwRoute)
  .notFound((c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api',
    };
    return c.json(payload, payload.statusCode);
  })
  .onError((err, c) => {
    if (err instanceof GW2RateLimitError) {
      const retryAfter = Math.ceil(err.retryAfterMs / 1000);
      c.header('Retry-After', String(retryAfter));
      const payload: ErrorPayload = {
        message: 'GW2 API rate limited — try again later',
        statusCode: 503,
        url: new URL(c.req.url).pathname,
        service: 'service-api',
      };
      return c.json(payload, 503);
    }
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

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
    const didInvalidate = await checkBuildId(env);
    if (didInvalidate) {
      ctx.waitUntil(warmStaticCaches(env));
    }
    // Ensure the MatchupPoller DO is awake. The DO schedules its own alarm loop;
    // this fetch is only needed if the DO has been evicted and the alarm has lapsed.
    ctx.waitUntil(env.MATCHUP_POLLER.getByName('global').fetch('https://internal/poller'));
  },
};
