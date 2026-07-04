import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Context, TypedResponse } from 'hono';

export async function withCache(c: Context, ttl: number, handler: () => Promise<Response>): Promise<Response> {
  // Bump the version suffix when a route's JSON response shape changes.
  // Named caches cannot be purged externally — a new name is the only way
  // to invalidate stale entries across all Cloudflare colos.
  const cache = await caches.open('service-api-v2');
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

export function withCacheJson<T, S extends ContentfulStatusCode = 200>(
  c: Context,
  ttl: number,
  data: T,
  // 200 is always a valid ContentfulStatusCode; the assertion is only needed to satisfy the generic S.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  status: S = 200 as S,
): Promise<TypedResponse<T, S, 'json'>> {
  // withCache operates on the untyped base Response; c.json(data, status) just above already
  // produced a correctly-shaped TypedResponse, but that shape doesn't survive the generic boundary.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  return withCache(c, ttl, () => Promise.resolve(c.json(data, status))) as unknown as Promise<
    TypedResponse<T, S, 'json'>
  >;
}
