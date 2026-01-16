import { renderEmblemById } from '@/lib/renderer';

interface ErrorPayload {
  message: string;
  status: number;
}

export interface CloudflareEnv {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
  EMBLEM_ASSETS: R2Bucket;
}

export default {
  async fetch(
    _request: Request,
    _env: CloudflareEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(_request.url);

    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 404 });
    }

    const cache = caches.default;
    const cachedResponse = await cache.match(_request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Example: /emblem/{guildId}
    const match = /^\/emblem\/([^/]+)/.exec(url.pathname);
    const GUILD_ID = match ? match[1] : null;

    if (GUILD_ID) {
      return handleEmblemRoute(_env, ctx, _request, GUILD_ID);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleEmblemRoute(
  env: CloudflareEnv,
  ctx: ExecutionContext,
  request: Request,
  guildId: string
): Promise<Response> {
  try {
    const emblemBytes = await renderEmblemById(guildId, {
      objectStore: env.EMBLEM_ASSETS,
      kvStore: env.EMBLEM_ENGINE_GUILD_LOOKUP,
    });

    const digest = await crypto.subtle.digest('SHA-1', emblemBytes);
    const etag = `"${bufferToHex(digest)}"`;

    const response = new Response(emblemBytes, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
        ETag: etag,
      },
    });

    const cache = caches.default;
    ctx.waitUntil(cache.put(request, response.clone()));

    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304, headers: response.headers });
    }

    return response;
  } catch (e: unknown) {
    console.error(e);
    if (typeof e === 'object' && e !== null && 'status' in e) {
      const err = e as ErrorPayload;
      return new Response(err.message, { status: err.status });
    }
    return new Response('Error rendering emblem', { status: 500 });
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
