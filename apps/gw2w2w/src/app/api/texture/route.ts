import { getCloudflareContext } from '@opennextjs/cloudflare';
import { type NextRequest, NextResponse } from 'next/server';

import { CACHE_TTL } from '@repo/service-api/lib/resources/constants';
import { isEmpty, isNonEmptyString } from '@repo/utils';

const ALLOWED_HOSTNAME = 'render.guildwars2.com';
const ALLOWED_PATH_PREFIX = '/file/';
const R2_KEY_PREFIX = 'textures:';
const UPSTREAM_BASE_URL = `https://${ALLOWED_HOSTNAME}`;

function parseAllowedTexturePath(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== ALLOWED_HOSTNAME) {
    return null;
  }
  const { pathname } = url;
  if (!pathname.startsWith(ALLOWED_PATH_PREFIX)) {
    return null;
  }
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname).toLowerCase();
  } catch {
    return null;
  }
  if (decodedPath.includes('/../') || decodedPath.endsWith('/..') || decodedPath.includes('/./')) {
    return null;
  }
  const canonicalPath = new URL(pathname, UPSTREAM_BASE_URL).pathname;
  if (canonicalPath !== pathname || !canonicalPath.startsWith(ALLOWED_PATH_PREFIX)) {
    return null;
  }
  return canonicalPath;
}

export async function GET(request: NextRequest) {
  const textureUrl = request.nextUrl.searchParams.get('url');
  const safePath = isNonEmptyString(textureUrl) ? parseAllowedTexturePath(textureUrl) : null;

  if (isEmpty(safePath)) {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
  }

  // Build upstream URL from server-controlled base + validated canonical path.
  const safeUrl = new URL(safePath, UPSTREAM_BASE_URL);

  const { env } = await getCloudflareContext({ async: true });
  const r2Key = R2_KEY_PREFIX + encodeURIComponent(safeUrl.toString());

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
  const upstream = await fetch(safeUrl.toString(), { headers: { 'User-Agent': 'gw2w2w.com' } });
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
