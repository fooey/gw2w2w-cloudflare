// c:\src\gw2w2w-cloudflare\apps\emblem-engine\src\emblem-renderer.ts
import { fliph, flipv, PhotonImage } from '@cf-wasm/photon';

import { type Color, type Guild } from './resources/resources';

const IMAGE_DIMENSION = 256;
type ColorRGB = [number, number, number];

export async function renderEmblem(
  emblem: Guild['emblem'],
  colors: Color[],
  bgBuf: ArrayBuffer | null,
  fgBuf1: ArrayBuffer | null,
  fgBuf2: ArrayBuffer | null
): Promise<PhotonImage> {
  if (!emblem) {
    throw new Error('NoEmblemData');
  }

  const colorMap = new Map<number, ColorRGB>(
    colors ? colors.map((c) => [c.id, c.cloth.rgb] as [number, ColorRGB]) : []
  );

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

export function renderEmblemLayers(
  bgBuf: ArrayBuffer | null,
  fgBuf1: ArrayBuffer | null,
  fgBuf2: ArrayBuffer | null,
  options: {
    flipBgH: boolean;
    flipBgV: boolean;
    flipFgH: boolean;
    flipFgV: boolean;
    bgRGB: ColorRGB;
    fg1RGB: ColorRGB;
    fg2RGB: ColorRGB;
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
