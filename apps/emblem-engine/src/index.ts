import { renderEmblem } from './emblem-renderer';
import {
  getColor,
  getEmblemBackground,
  getEmblemForeground,
  getGuild,
} from './resources';

interface ErrorPayload {
  message: string;
  status: number;
}

interface Env {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
  EMBLEM_ASSETS: R2Bucket;
}

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
        const emblem = await renderEmblemById(GUILD_ID, _env);
        return new Response(emblem.get_bytes_webp(), {
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

async function renderEmblemById(guildId: string, env: Env) {
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

  const emblem = await renderEmblem(guild.emblem, bgDefs, fgDefs, colors);

  return emblem;
}
