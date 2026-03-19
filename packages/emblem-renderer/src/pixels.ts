export const IMAGE_DIMENSION = 256;
export type ColorRGB = [number, number, number];

export interface DecodedLayer {
  /** Raw RGBA pixels in row-major order, same layout as ImageData.data */
  data: Uint8Array;
  /** Uint32 view over data for fast pixel access */
  u32: Uint32Array;
  width: number;
  height: number;
}

export interface RenderOptions {
  flags?: string[];
  bgRGB: ColorRGB;
  fg1RGB: ColorRGB;
  fg2RGB: ColorRGB;
}

export function getFlipsFromFlags(flags: string[] | undefined) {
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

  // If no background provided, create a transparent 256×256 canvas
  let outData: Uint8Array<ArrayBuffer>;
  let width: number;
  let height: number;

  if (bg) {
    // Copy so we don't mutate the decoded cache
    outData = new Uint8Array(bg.data.buffer.slice(0) as ArrayBuffer);
    width = bg.width;
    height = bg.height;
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
        const outA = (fg1A + (a * invA) / 255) | 0;
        if (outA > 0) {
          r = ((fg1R * fg1A + (r * a * invA) / 255) / outA) | 0;
          g = ((fg1G * fg1A + (g * a * invA) / 255) / outA) | 0;
          b = ((fg1B * fg1A + (b * a * invA) / 255) / outA) | 0;
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
        const outA = (fg2A + (a * invA) / 255) | 0;
        if (outA > 0) {
          r = ((fg2R * fg2A + (r * a * invA) / 255) / outA) | 0;
          g = ((fg2G * fg2A + (g * a * invA) / 255) / outA) | 0;
          b = ((fg2B * fg2A + (b * a * invA) / 255) / outA) | 0;
          a = outA;
        }
      }
    }

    outU32[i] = (a << 24) | (b << 16) | (g << 8) | r;
  }

  return { data: outData, u32: outU32, width, height };
}
