import type { PhotonImage } from '@cf-wasm/photon';
import { renderEmblem } from './emblem-renderer';
import {
  fetchBinaryAsBuffer,
  getColor,
  getEmblemBackground,
  getEmblemForeground,
  getGuild,
} from './resources/resources';

interface ErrorPayload {
  message: string;
  status: number;
}

interface Env {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
  EMBLEM_ASSETS: R2Bucket;
}

const R2_TTL = 86400; // 24 hours
const enableCacheLogging = true;

export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    const url = new URL(_request.url);
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 404 });
    }

    // Example: /emblem/{guildId}
    const match = /^\/emblem\/([^/]+)/.exec(url.pathname);
    const GUILD_ID = match ? match[1] : null;

    if (GUILD_ID) {
      try {
        const emblemBytes = await renderEmblemById(_env, GUILD_ID);
        return new Response(emblemBytes, {
          headers: { 'Content-Type': 'image/webp' },
        });
      } catch (e: unknown) {
        console.error(e);
        if (typeof e === 'object' && e !== null && 'status' in e) {
          const err = e as ErrorPayload;
          return new Response(err.message, { status: err.status });
        }
        return new Response('Error rendering emblem', { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function renderEmblemById(env: Env, guildId: string) {
  const r2 = env.EMBLEM_ASSETS;
  const R2_KEY = `emblem:${guildId}`;

  const object = await r2.get(R2_KEY);

  if (object !== null) {
    if (enableCacheLogging) console.log(`r2 HIT for ${R2_KEY}`);
    return new Uint8Array(await object.arrayBuffer());
  }

  if (enableCacheLogging) console.log(`r2 MISS for ${R2_KEY}`);

  // 1. Fetch Guild Data

  const guild = await getGuild(env.EMBLEM_ENGINE_GUILD_LOOKUP, guildId);

  if (!guild) {
    throw { message: 'Guild not found', status: 404 };
  }

  if (!guild.emblem) {
    throw { message: 'Guild has no emblem', status: 404 };
  }

  // Prepare IDs
  const bgId = guild.emblem.background.id;
  const fgId = guild.emblem.foreground.id;
  const colorIds = [
    ...guild.emblem.background.colors,
    ...guild.emblem.foreground.colors,
  ];
  const uniqueColorIds = [...new Set(colorIds)];

  // Fetch Definitions & Colors
  const [bgDefs, fgDefs, colors] = await Promise.all([
    bgId ? getEmblemBackground(env.EMBLEM_ASSETS, bgId) : null,
    fgId ? getEmblemForeground(env.EMBLEM_ASSETS, fgId) : null,
    uniqueColorIds.length > 0
      ? getColor(env.EMBLEM_ASSETS, uniqueColorIds)
      : null,
  ]);

  if (!colors) {
    throw { message: 'Colors not found', status: 500 };
  }

  const bgDef = bgDefs ? bgDefs[0] : null;
  const fgDef = fgDefs ? fgDefs[0] : null;

  const bgLayer = bgDef?.layers[0];
  const fgLayer1 = fgDef?.layers[1];
  const fgLayer2 = fgDef?.layers[2];

  const [bgBuf, fgBuf1, fgBuf2] = await Promise.all([
    fetchBinaryAsBuffer(env.EMBLEM_ASSETS, bgLayer),
    fetchBinaryAsBuffer(env.EMBLEM_ASSETS, fgLayer1),
    fetchBinaryAsBuffer(env.EMBLEM_ASSETS, fgLayer2),
  ]);

  const emblem = await renderEmblem(
    guild.emblem,
    colors,
    bgBuf,
    fgBuf1,
    fgBuf2
  );

  const bytes = emblem.get_bytes_webp();

  await r2.put(R2_KEY, bytes, {
    customMetadata: {
      expiresAt: new Date(Date.now() + R2_TTL * 1000).toISOString(),
    },
    httpMetadata: {
      contentType: 'image/webp',
    },
  });

  return bytes;
}
