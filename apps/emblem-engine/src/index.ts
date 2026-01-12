import { fliph, flipv, PhotonImage } from '@cf-wasm/photon';

// const GUILD_ID = '0560f931-40de-e811-81a8-a25fc8b1a2fe';
// const GUILD_ID = '4b9a0dd5-79e4-e811-81a8-e8b6963692b8';

const IMAGE_DIMENSION = 256;

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
    bgId
      ? fetch(`https://api.guildwars2.com/v2/emblem/backgrounds?ids=${bgId}`)
      : null,
    fgId
      ? fetch(`https://api.guildwars2.com/v2/emblem/foregrounds?ids=${fgId}`)
      : null,
    uniqueColorIds.length > 0
      ? fetch(
          `https://api.guildwars2.com/v2/colors?ids=${uniqueColorIds.join(',')}`
        )
      : null,
  ]);

  const bgDefs =
    bgDefRes && bgDefRes.ok ? ((await bgDefRes.json()) as EmblemDef[]) : [];
  const fgDefs =
    fgDefRes && fgDefRes.ok ? ((await fgDefRes.json()) as EmblemDef[]) : [];
  const colors =
    colorsRes && colorsRes.ok ? ((await colorsRes.json()) as ColorDef[]) : [];

  const bgDef = bgDefs[0];
  const fgDef = fgDefs[0];

  const colorMap = new Map<number, [number, number, number]>(
    colors.map((c) => [c.id, c.cloth.rgb] as [number, [number, number, number]])
  );

  // 4. Fetch Layer Images
  // Background: Layer 0. Foreground: Layer 1 (Primary), Layer 2 (Secondary).
  const bgLayer = bgDef?.layers[0];
  const fgLayer1 = fgDef?.layers[1];
  const fgLayer2 = fgDef?.layers[2];

  const fetchBuffer = async (url?: string) => {
    if (!url) return null;
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.arrayBuffer();
  };

  const [bgBuf, fgBuf1, fgBuf2] = await Promise.all([
    fetchBuffer(bgLayer),
    fetchBuffer(fgLayer1),
    fetchBuffer(fgLayer2),
  ]);

  const flipBgH = emblem.flags?.includes('FlipBackgroundHorizontal') ?? false;
  const flipBgV = emblem.flags?.includes('FlipBackgroundVertical') ?? false;
  const flipFgH = emblem.flags?.includes('FlipForegroundHorizontal') ?? false;
  const flipFgV = emblem.flags?.includes('FlipForegroundVertical') ?? false;

  const bgRGB = colorMap.get(emblem.background.colors[0] ?? 0) ?? [0, 0, 0];
  const fg1RGB = colorMap.get(emblem.foreground.colors[0] ?? 0) ?? [0, 0, 0];
  const fg2RGB = colorMap.get(emblem.foreground.colors[1] ?? 0) ?? [0, 0, 0];

  return renderEmblemLayers(bgBuf, fgBuf1, fgBuf2, {
    flipBgH,
    flipBgV,
    flipFgH,
    flipFgV,
    bgRGB,
    fg1RGB,
    fg2RGB,
  });
}

function renderEmblemLayers(
  bgBuf: ArrayBuffer | null,
  fgBuf1: ArrayBuffer | null,
  fgBuf2: ArrayBuffer | null,
  options: {
    flipBgH: boolean;
    flipBgV: boolean;
    flipFgH: boolean;
    flipFgV: boolean;
    bgRGB: [number, number, number];
    fg1RGB: [number, number, number];
    fg2RGB: [number, number, number];
  }
) {
  const { flipBgH, flipBgV, flipFgH, flipFgV, bgRGB, fg1RGB, fg2RGB } = options;

  // Helper to prepare layer data
  const prepare = (buf: ArrayBuffer | null, h: boolean, v: boolean) => {
    if (!buf) return null;
    const img = PhotonImage.new_from_byteslice(new Uint8Array(buf));
    const rotate180 = h && v;
    if (!rotate180) {
      if (h) fliph(img);
      if (v) flipv(img);
    }
    const data = img.get_raw_pixels();
    const u32 = new Uint32Array(data.buffer, data.byteOffset, data.length >> 2);
    if (rotate180) u32.reverse();
    return { img, data, u32 };
  };

  let bg = prepare(bgBuf, flipBgH, flipBgV);

  // If background is missing, create a 256x256 transparent canvas
  if (!bg) {
    const width = IMAGE_DIMENSION;
    const height = IMAGE_DIMENSION;
    const data = new Uint8Array(width * height * 4);
    const img = new PhotonImage(data, width, height);
    const u32 = new Uint32Array(data.buffer);
    bg = { img, data, u32 };
  }

  const fg1 = prepare(fgBuf1, flipFgH, flipFgV);
  const fg2 = prepare(fgBuf2, flipFgH, flipFgV);

  const [bgR, bgG, bgB] = bgRGB;
  const [fg1R, fg1G, fg1B] = fg1RGB;
  const [fg2R, fg2G, fg2B] = fg2RGB;

  const len = bg.u32.length;
  for (let i = 0; i < len; i++) {
    // 1. Background (Red channel as Alpha)
    const bgPixel = bg.u32[i]!;
    let a = bgPixel & 0xff;
    let r = bgR;
    let g = bgG;
    let b = bgB;

    if (a === 0) {
      r = 0;
      g = 0;
      b = 0;
    }

    // 2. Foreground 1 (Alpha channel)
    if (fg1) {
      const fg1Pixel = fg1.u32[i]!;
      const fg1A = fg1Pixel >>> 24;
      if (fg1A > 0) {
        // Blend FG1 over BG
        const invA = 255 - fg1A;
        const outA = (fg1A + (a * invA) / 255) | 0;
        if (outA > 0) {
          r = ((fg1R * fg1A + (r * a * invA) / 255) / outA) | 0;
          g = ((fg1G * fg1A + (g * a * invA) / 255) / outA) | 0;
          b = ((fg1B * fg1A + (b * a * invA) / 255) / outA) | 0;
          a = outA;
        }
      }
    }

    // 3. Foreground 2 (Alpha channel)
    if (fg2) {
      const fg2Pixel = fg2.u32[i]!;
      const fg2A = fg2Pixel >>> 24;
      if (fg2A > 0) {
        const invA = 255 - fg2A;
        const outA = (fg2A + (a * invA) / 255) | 0;
        if (outA > 0) {
          r = ((fg2R * fg2A + (r * a * invA) / 255) / outA) | 0;
          g = ((fg2G * fg2A + (g * a * invA) / 255) / outA) | 0;
          b = ((fg2B * fg2A + (b * a * invA) / 255) / outA) | 0;
          a = outA;
        }
      }
    }

    // Write back to BG buffer
    bg.u32[i] = (a << 24) | (b << 16) | (g << 8) | r;
  }

  return new PhotonImage(bg.data, bg.img.get_width(), bg.img.get_height());
}

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
