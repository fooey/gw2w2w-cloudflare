import type { Context, TypedResponse } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

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

/**
 * Like withCache, but the handler itself decides what to compute and return, instead of the
 * caller fetching data first and only caching its serialization. Use this when a cache hit needs
 * to skip real work (a DB/API call) rather than just re-serializing data already fetched —
 * withCacheJson's `data` argument is evaluated before it's called, so it can never skip a fetch
 * the caller made ahead of time. Preserves the handler's own return type (e.g. a Hono
 * TypedResponse union) instead of widening to a bare Response, so RPC clients keep precise
 * inference.
 */
export async function withCachedResponse<T extends Response>(
  c: Context,
  ttl: number,
  handler: () => Promise<T>,
): Promise<T> {
  const response = await withCache(c, ttl, handler);
  // withCache's own signature intentionally widens to Response — T is guaranteed by handler's signature.
  // A direct cast (not through `unknown`) is safe here since T is constrained to extend Response.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  return response as T;
}

export async function withCacheJson<T, S extends ContentfulStatusCode = 200>(
  c: Context,
  ttl: number,
  data: T,
  // 200 is always a valid ContentfulStatusCode; the assertion is only needed to satisfy the generic S.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  status: S = 200 as S,
): Promise<TypedResponse<T, S, 'json'>> {
  // withCache operates on the untyped base Response; c.json(data, status) just above already
  // produced a correctly-shaped TypedResponse, but that shape doesn't survive the generic boundary.
  // async is required here since withCache's handler param must return Promise<Response>,
  // but c.json(...) returns a Response synchronously — no real await needed.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion, typescript/require-await
  return withCache(c, ttl, async () => c.json(data, status)) as unknown as Promise<TypedResponse<T, S, 'json'>>;
}
