import { type ContentfulStatusCode } from 'hono/utils/http-status';
import { type Context, type TypedResponse } from 'hono';

export async function withCache(c: Context, ttl: number, handler: () => Promise<Response>): Promise<Response> {
  const cache = await caches.open('service-api');
  const cached = await cache.match(c.req.raw);
  // CF cache responses have immutable headers — wrap in a new Response so
  // downstream middleware (etag, cors, etc.) can mutate headers freely.
  if (cached) return new Response(cached.body, cached);

  const response = await handler();
  if (response.ok) {
    const clone = response.clone();
    clone.headers.set('Cache-Control', `public, max-age=${ttl}`);
    c.executionCtx.waitUntil(cache.put(c.req.raw, clone));
  }
  return response;
}

export function withCacheJson<T>(
  c: Context,
  ttl: number,
  data: T,
  status: ContentfulStatusCode = 200,
): Promise<TypedResponse<T, ContentfulStatusCode, 'json'>> {
  return withCache(c, ttl, () => Promise.resolve(c.json(data, status))) as unknown as Promise<
    TypedResponse<T, ContentfulStatusCode, 'json'>
  >;
}
