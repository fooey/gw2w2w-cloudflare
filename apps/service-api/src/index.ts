import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';

import { allowedCsrf, allowedOrigin } from '@repo/utils';

import { checkBuildId, warmStaticCaches } from './cron/buildWatcher';
import { GW2RateLimitError } from './lib/resources/api';
import { apiGw2Route } from './routes/gw2';
import { createOpenAPIRoutes } from './routes/openapi';
import { apiWvwRoute } from './routes/wvw';

export { MatchupPoller } from './durable-objects/MatchupPoller';

export const ErrorPayloadSchema = z.object({
  message: z.string(),
  // zod can only runtime-check the numeric range; asserting the precise ContentfulStatusCode
  // literal union would require listing every valid HTTP status code explicitly.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  statusCode: z.number().int().min(100).max(599) as z.ZodType<ContentfulStatusCode>,
  url: z.string(),
  service: z.string(),
});

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

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
    // eslint-disable-next-line node/callback-return -- Hono's async middleware `next()` isn't a Node-style callback; code after it is expected.
    await next();
    c.header('Vary', 'Origin', { append: true });
  })
  .use('*', secureHeaders())
  .use('*', cors({ origin: (origin, c) => allowedOrigin(origin, c.req.header('host')) }))
  .use(csrf({ origin: (origin, c) => allowedCsrf(origin, c.req.header('host')) }))
  .use('*', async (c, next) => {
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
  // eslint-disable-next-line promise/prefer-await-to-callbacks -- Hono's .onError() is a synchronous handler-registration API, not callback-style async code.
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

app.route('', createOpenAPIRoutes(app));

export type ServiceApiAppType = typeof app;

const worker = {
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

export default worker;
