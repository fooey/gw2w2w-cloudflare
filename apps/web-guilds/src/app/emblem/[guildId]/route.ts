import type { NextRequest } from 'next/server';

import type { ServiceEmblemAppType } from '@repo/service-emblem';
import { hc } from 'hono/client';

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const { env } = process;
  const { guildId } = await params;

  // on production this is routed to the service-emblem worker directly by cloudflare
  if (!guildId || env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  return fetchEmblem(guildId);
}

async function fetchEmblem(guildId: string) {
  const client = hc<ServiceEmblemAppType>('http://localhost:8787/');
  const getEmblem = client.emblem[':guildId']?.$get;

  if (!getEmblem) {
    return new Response('Not Found', { status: 404 });
  }

  return getEmblem({ param: { guildId } });
}
