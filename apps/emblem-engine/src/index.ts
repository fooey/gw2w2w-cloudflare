import { fliph, flipv, PhotonImage, watermark } from '@cf-wasm/photon';

// const GUILD_ID = '0560f931-40de-e811-81a8-a25fc8b1a2fe';
// const GUILD_ID = '4b9a0dd5-79e4-e811-81a8-e8b6963692b8';

export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    const url = new URL(_request.url);
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 404 });
    }

    // Example: /emblem/{guildId}
    const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
    const guildIdFromPath = pathParts[1];
    const GUILD_ID = guildIdFromPath ?? null;

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
  const guildRes = await fetch(
    `https://api.guildwars2.com/v2/guild/${guildId}`
  );
  if (!guildRes.ok)
    throw {
      message: 'Guild not found',
      status: 404,
    };
  const guild = (await guildRes.json()) as Guild;

  if (!guild.emblem) throw { message: 'Guild has no emblem', status: 404 };

  const emblem = await renderEmblem(guild.emblem);

  return emblem;
}

async function renderEmblem(emblem: GuildEmblem): Promise<PhotonImage> {
  // 2. Prepare IDs
  const bgId = emblem.background.id;
  const fgId = emblem.foreground.id;
  const colorIds = [...emblem.background.colors, ...emblem.foreground.colors];
  const uniqueColorIds = [...new Set(colorIds)];

  // 3. Fetch Definitions & Colors
  const [bgDefRes, fgDefRes, colorsRes] = await Promise.all([
    fetch(`https://api.guildwars2.com/v2/emblem/backgrounds?ids=${bgId}`),
    fetch(`https://api.guildwars2.com/v2/emblem/foregrounds?ids=${fgId}`),
    fetch(
      `https://api.guildwars2.com/v2/colors?ids=${uniqueColorIds.join(',')}`
    ),
  ]);

  const bgDefs = (await bgDefRes.json()) as EmblemDef[];
  const fgDefs = (await fgDefRes.json()) as EmblemDef[];
  const colors = (await colorsRes.json()) as ColorDef[];

  const bgDef = bgDefs[0];
  const fgDef = fgDefs[0];

  if (!bgDef || !fgDef) {
    throw {
      message: 'Emblem background or foreground definition not found',
      status: 500,
    };
  }

  const colorMap = new Map<number, [number, number, number]>(
    colors.map((c) => [c.id, c.cloth.rgb] as [number, [number, number, number]])
  );

  // 4. Fetch Layer Images
  // Background: Layer 0. Foreground: Layer 1 (Primary), Layer 2 (Secondary).
  const bgLayer = bgDef.layers[0];
  const fgLayer1 = fgDef.layers[1];
  const fgLayer2 = fgDef.layers[2];

  if (!bgLayer || !fgLayer1 || !fgLayer2) {
    throw {
      message: 'Emblem layers not found',
      status: 500,
    };
  }

  const [bgBuf, fgBuf1, fgBuf2] = await Promise.all([
    fetch(bgLayer).then((r) => r.arrayBuffer()),
    fetch(fgLayer1).then((r) => r.arrayBuffer()),
    fetch(fgLayer2).then((r) => r.arrayBuffer()),
  ]);

  const flipBgH = emblem.flags?.includes('FlipBackgroundHorizontal') ?? false;
  const flipBgV = emblem.flags?.includes('FlipBackgroundVertical') ?? false;
  const flipFgH = emblem.flags?.includes('FlipForegroundHorizontal') ?? false;
  const flipFgV = emblem.flags?.includes('FlipForegroundVertical') ?? false;

  const bgRGB = colorMap.get(emblem.background.colors[0] ?? 0);
  if (!bgRGB) throw { message: 'Background color not found', status: 500 };

  const fg1RGB = colorMap.get(emblem.foreground.colors[0] ?? 0);
  if (!fg1RGB) throw { message: 'Foreground color 1 not found', status: 500 };

  const fg2RGB = colorMap.get(emblem.foreground.colors[1] ?? 0);
  if (!fg2RGB) throw { message: 'Foreground color 2 not found', status: 500 };

  const bgImg = processBackground(bgBuf, bgRGB, flipBgH, flipBgV);
  const fgImg1 = processForeground(fgBuf1, fg1RGB, flipFgH, flipFgV);
  const fgImg2 = processForeground(fgBuf2, fg2RGB, flipFgH, flipFgV);

  // Composite: BG < -FG1 < -FG2;
  watermark(bgImg, fgImg1, 0n, 0n);
  watermark(bgImg, fgImg2, 0n, 0n);

  return bgImg;
}

const processBackground = (
  buf: ArrayBuffer,
  rgb: [number, number, number],
  flipH: boolean,
  flipV: boolean
) => {
  const img = PhotonImage.new_from_byteslice(new Uint8Array(buf));

  if (flipH) fliph(img);
  if (flipV) flipv(img);

  const [r, g, b] = rgb;
  const data = img.get_raw_pixels();
  const u32 = new Uint32Array(data.buffer, data.byteOffset, data.length >> 2);

  // Little-endian: 0xAABBGGRR
  const redChannel = r;
  const greenChannel = g << 8;
  const blueChannel = b << 16;
  const baseColor = blueChannel | greenChannel | redChannel;

  for (let i = 0; i < u32.length; i++) {
    const pixel = u32[i]!;
    const alpha = pixel & 0xff; // red channel holds alpha in GW2 emblem layers
    if (alpha === 0) {
      u32[i] = 0;
    } else {
      const alphaChannel = alpha << 24;
      u32[i] = alphaChannel | baseColor;
    }
  }

  return new PhotonImage(data, img.get_width(), img.get_height());
};

const processForeground = (
  buf: ArrayBuffer,
  rgb: [number, number, number],
  flipH: boolean,
  flipV: boolean
) => {
  const img = PhotonImage.new_from_byteslice(new Uint8Array(buf));
  if (flipH) fliph(img);
  if (flipV) flipv(img);

  const data = img.get_raw_pixels();
  const u32 = new Uint32Array(data.buffer, data.byteOffset, data.length >> 2);
  const [rTint, gTint, bTint] = rgb;

  for (let i = 0; i < u32.length; i++) {
    const pixel = u32[i]!;

    const currentAlpha = pixel & 0xff000000;
    if (currentAlpha === 0) continue; // skip transparent pixels

    const r = pixel & 0xff;
    const g = (pixel >> 8) & 0xff;
    const b = (pixel >> 16) & 0xff;

    const newR = ((r * rTint) / 255) | 0;
    const newG = ((g * gTint) / 255) | 0;
    const newB = ((b * bTint) / 255) | 0;

    u32[i] = newR | (newG << 8) | (newB << 16) | currentAlpha;
  }

  return new PhotonImage(data, img.get_width(), img.get_height());
};

interface ErrorPayload {
  message: string;
  status: number;
}

interface Env {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
}

interface Guild {
  emblem?: GuildEmblem;
}

interface GuildEmblem {
  background: { id: number; colors: number[] };
  foreground: { id: number; colors: number[] };
  flags?: string[];
}

interface EmblemDef {
  id: number;
  layers: string[];
}

interface ColorDef {
  id: number;
  cloth: { rgb: [number, number, number] };
}
