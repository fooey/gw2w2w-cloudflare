// This file does pixel/alpha-channel compositing math, so bitwise operators are intentional here.
/* eslint-disable no-bitwise */
export const IMAGE_DIMENSION = 128;
export type ColorRGB = readonly [number, number, number];

export interface DecodedLayer {
  /** Raw RGBA pixels in row-major order, same layout as ImageData.data */
  readonly data: Uint8Array;
  /** Uint32 view over data for fast pixel access */
  readonly u32: Uint32Array;
  readonly width: number;
  readonly height: number;
}

export interface RenderOptions {
  readonly flags?: readonly string[];
  readonly bgRGB: ColorRGB;
  readonly fg1RGB: ColorRGB;
  readonly fg2RGB: ColorRGB;
}

export function getFlipsFromFlags(flags: readonly string[] | undefined): {
  flipBgH: boolean;
  flipBgV: boolean;
  flipFgH: boolean;
  flipFgV: boolean;
} {
  return {
    flipBgH: flags?.includes('FlipBackgroundHorizontal') ?? false,
    flipBgV: flags?.includes('FlipBackgroundVertical') ?? false,
    flipFgH: flags?.includes('FlipForegroundHorizontal') ?? false,
    flipFgV: flags?.includes('FlipForegroundVertical') ?? false,
  };
}

/**
 * Composites up to three decoded emblem layers into a new RGBA pixel buffer.
 *
 * Background layer uses its red channel as an opacity mask for bgRGB.
 * Foreground layers use their alpha channel and are Porter-Duff "over" blended.
 *
 * Passing null for any layer skips it, which allows rendering individual layers
 * as previews (e.g. bg-only, fg1-only, etc.).
 */
export function renderEmblemPixels(
  bg: DecodedLayer | null,
  fg1: DecodedLayer | null,
  fg2: DecodedLayer | null,
  options: RenderOptions,
): DecodedLayer {
  const { bgRGB, fg1RGB, fg2RGB } = options;
  const [bgR, bgG, bgB] = bgRGB;
  const [fg1R, fg1G, fg1B] = fg1RGB;
  const [fg2R, fg2G, fg2B] = fg2RGB;

  let outData: Uint8Array<ArrayBuffer>;
  let width: number;
  let height: number;

  if (bg) {
    // Copy only the pixel bytes so we don't mutate the decoded cache.
    // bg.data.buffer may be the entire WASM linear memory (much larger than
    // the pixel data), so we copy bg.data itself rather than the full buffer.
    outData = new Uint8Array(bg.data);
    ({ width, height } = bg);
  } else {
    width = IMAGE_DIMENSION;
    height = IMAGE_DIMENSION;
    outData = new Uint8Array(width * height * 4);
  }
  const outU32 = new Uint32Array(outData.buffer);

  const len = outU32.length;
  for (let i = 0; i < len; i++) {
    // 1. Background (red channel as alpha mask)
    const bgPixel = outU32[i];
    if (bgPixel === undefined) continue;

    let a = bgPixel & 0xff;
    let r = bgR;
    let g = bgG;
    let b = bgB;

    if (a === 0) {
      r = 0;
      g = 0;
      b = 0;
    }

    // 2. Foreground 1 (alpha channel, Porter-Duff over)
    if (fg1) {
      const fg1Pixel = fg1.u32[i];
      if (fg1Pixel === undefined) continue;
      const fg1A = fg1Pixel >>> 24;
      if (fg1A > 0) {
        const invA = 255 - fg1A;
        const outA = Math.trunc(fg1A + (a * invA) / 255);
        if (outA > 0) {
          r = Math.trunc((fg1R * fg1A + (r * a * invA) / 255) / outA);
          g = Math.trunc((fg1G * fg1A + (g * a * invA) / 255) / outA);
          b = Math.trunc((fg1B * fg1A + (b * a * invA) / 255) / outA);
          a = outA;
        }
      }
    }

    // 3. Foreground 2 (alpha channel, Porter-Duff over)
    if (fg2) {
      const fg2Pixel = fg2.u32[i];
      if (fg2Pixel === undefined) continue;
      const fg2A = fg2Pixel >>> 24;
      if (fg2A > 0) {
        const invA = 255 - fg2A;
        const outA = Math.trunc(fg2A + (a * invA) / 255);
        if (outA > 0) {
          r = Math.trunc((fg2R * fg2A + (r * a * invA) / 255) / outA);
          g = Math.trunc((fg2G * fg2A + (g * a * invA) / 255) / outA);
          b = Math.trunc((fg2B * fg2A + (b * a * invA) / 255) / outA);
          a = outA;
        }
      }
    }

    outU32[i] = (a << 24) | (b << 16) | (g << 8) | r;
  }

  return { data: outData, u32: outU32, width, height };
}
