import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/gw2api/[[...slug]]'>,
) {
  const { slug } = await ctx.params;

  // on production this is routed to the gw2api worker directly by cloudflare
  if (!slug || process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  return proxyApi(slug.join('/'), req);
}

async function proxyApi(slug: string, req: NextRequest) {
  const url = `http://internal/gw2api/${slug}`;

  const isBodyless = req.method === 'GET' || req.method === 'HEAD';
  const body = isBodyless ? undefined : await req.arrayBuffer();

  const res = await getCloudflareContext().env.SERVICE_GW2API.fetch(url, {
    method: req.method,
    headers: req.headers,
    body,
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
