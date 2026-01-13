import { renderEmblem } from './emblem-renderer';
import { getGuild } from './resources';

interface ErrorPayload {
  message: string;
  status: number;
}

interface Env {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
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
        const emblem = await renderEmblemById(GUILD_ID);
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

async function renderEmblemById(guildId: string) {
  // 1. Fetch Guild Data

  let guild;

  try {
    guild = await getGuild(guildId);
  } catch (e) {
    throw { message: 'Guild not found', status: 404 };
  }

  // if (!guildRes.ok)
  //   throw {
  //     message: 'Guild not found',
  //     status: 404,
  //   };
  // const guild = (await guildRes.json()) as Guild;

  if (!guild.emblem) throw { message: 'Guild has no emblem', status: 404 };

  const emblem = await renderEmblem(guild.emblem);

  return emblem;
}
