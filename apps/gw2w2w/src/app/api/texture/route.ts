import { getCloudflareContext } from '@opennextjs/cloudflare';
import { CACHE_TTL } from '@service-api/lib/resources/constants';
import { type NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTNAME = 'render.guildwars2.com';
const ALLOWED_PATH_PREFIX = '/file/';
const R2_KEY_PREFIX = 'textures:';

function isAllowedTextureUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && url.hostname === ALLOWED_HOSTNAME && url.pathname.startsWith(ALLOWED_PATH_PREFIX);
}

export async function GET(request: NextRequest) {
  const textureUrl = request.nextUrl.searchParams.get('url');

  if (!textureUrl || !isAllowedTextureUrl(textureUrl)) {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const r2Key = R2_KEY_PREFIX + encodeURIComponent(textureUrl);

  // Check R2 cache first (shared with service-emblem)
  const cached = await env.EMBLEM_ASSETS.get(r2Key);
  if (cached) {
    const buf = await cached.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, max-age=${CACHE_TTL.immutable.kv}, immutable`,
      },
    });
  }

  // R2 miss — fetch from GW2 CDN and populate cache
  const upstream = await fetch(textureUrl, { headers: { 'User-Agent': 'gw2w2w.com' } });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Texture not found' }, { status: 404 });
  }

  const buf = await upstream.arrayBuffer();

  // Write to R2 asynchronously — don't block the response
  void env.EMBLEM_ASSETS.put(r2Key, buf.slice(0), {
    customMetadata: {
      expiresAt: Temporal.Now.instant().add({ seconds: CACHE_TTL.immutable.kv }).toString(),
    },
  });

  return new Response(buf, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=${CACHE_TTL.immutable.kv}, immutable`,
    },
  });
}
