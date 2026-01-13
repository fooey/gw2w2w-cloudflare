import type { CloudflareEnv } from '..';
import {
  fetchBinaryAsBuffer,
  getColor,
  getEmblemBackground,
  getEmblemForeground,
  getGuild,
} from '../resources/resources';
import { renderEmblem } from './shared';

const R2_TTL = 86400; // 24 hours
const enableCacheLogging = true;

export async function renderEmblemById(env: CloudflareEnv, guildId: string) {
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
