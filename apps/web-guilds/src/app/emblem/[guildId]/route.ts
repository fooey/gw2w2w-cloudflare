import type { NextRequest } from 'next/server';

import type { AppType as EmblemAppType } from '@repo/service-emblem';
import { hc } from 'hono/client';

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/emblem/[guildId]'>,
) {
  const { env } = process;
  const { guildId } = await ctx.params;

  // on production this is routed to the service-emblem worker directly by cloudflare
  if (!guildId || env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  return fetchEmblem(guildId, req);
}

async function fetchEmblem(guildId: string, req: NextRequest) {
  const client = hc<EmblemAppType>('http://localhost:8787/');
  const res = await client.emblem[':guildId'].$get({
    param: {
      guildId,
    },
  });

  console.log(`🚀 ~ route.ts ~ fetchEmblem ~ res:`, res);

  return res;

  // return getCloudflareContext()
  //   .env.SERVICE_EMBLEM.fetch(`http://internal/emblem/${guildId}`, req)
  //   .then(
  //     (res) =>
  //       new Response(res.body, {
  //         status: res.status,
  //         statusText: res.statusText,
  //         headers: res.headers,
  //       }),
  //   );
}
