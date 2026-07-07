// This file does pixel buffer/layer math, so bitwise operators are intentional here.
/* eslint-disable no-bitwise */
import { fliph, flipv, PhotonImage, resize, SamplingFilter } from '@cf-wasm/photon';

import type { Color, Guild } from '@repo/service-api/types';

import type { ColorRGB } from './pixels';
import type { EmblemSize } from './sizes';
import { getFlipsFromFlags, IMAGE_DIMENSION, renderEmblemPixels } from './pixels';

export type { DecodedLayer, RenderOptions } from './pixels';
export { type ColorRGB, renderEmblemPixels } from './pixels';
export { DEFAULT_EMBLEM_SIZE, EMBLEM_SIZES, isEmblemSize, type EmblemSize } from './sizes';

export function resizeEmblemImage(image: PhotonImage, size: EmblemSize): PhotonImage {
  if (size === IMAGE_DIMENSION) return image;
  return resize(image, size, size, SamplingFilter.CatmullRom);
}

export function renderEmblem(
  emblem: Guild['emblem'],
  colors: Color[],
  bgBuf: ArrayBuffer | null,
  fgBuf1: ArrayBuffer | null,
  fgBuf2: ArrayBuffer | null,
): PhotonImage {
  if (!emblem) {
    throw new Error('NoEmblemData');
  }

  const colorMap = new Map<number, ColorRGB>(colors.map((c) => [c.id, c.cloth.rgb] as [number, ColorRGB]));

  const bgRGB = colorMap.get(emblem.background.colors[0] ?? -1) ?? [255, 0, 0];
  const fg1RGB = colorMap.get(emblem.foreground.colors[0] ?? -1) ?? [255, 0, 0];
  const fg2RGB = colorMap.get(emblem.foreground.colors[1] ?? -1) ?? [255, 0, 0];

  return renderEmblemLayers(bgBuf, fgBuf1, fgBuf2, {
    flags: emblem.flags,
    bgRGB,
    fg1RGB,
    fg2RGB,
  });
}

function decodeAndOrientLayer(buf: ArrayBuffer | null, h: boolean, v: boolean) {
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
  // img kept alive so its memory backing `data` remains valid
  return { img, data, u32, width: img.get_width(), height: img.get_height() };
}

/**
 * Server-side entry point: decodes PNG buffers via Photon WASM, composites layers,
 * and returns a PhotonImage ready for WebP encoding.
 */
export function renderEmblemLayers(
  bgBuf: ArrayBuffer | null,
  fgBuf1: ArrayBuffer | null,
  fgBuf2: ArrayBuffer | null,
  options: {
    flags?: string[];
    bgRGB: ColorRGB;
    fg1RGB: ColorRGB;
    fg2RGB: ColorRGB;
  },
): PhotonImage {
  const { flags } = options;
  const { flipBgH, flipBgV, flipFgH, flipFgV } = getFlipsFromFlags(flags);

  const bgLayer =
    decodeAndOrientLayer(bgBuf, flipBgH, flipBgV) ??
    (() => {
      const data = new Uint8Array(IMAGE_DIMENSION * IMAGE_DIMENSION * 4);
      const img = new PhotonImage(data, IMAGE_DIMENSION, IMAGE_DIMENSION);
      const u32 = new Uint32Array(data.buffer);
      return { img, data, u32, width: IMAGE_DIMENSION, height: IMAGE_DIMENSION };
    })();

  const result = renderEmblemPixels(
    bgLayer,
    decodeAndOrientLayer(fgBuf1, flipFgH, flipFgV),
    decodeAndOrientLayer(fgBuf2, flipFgH, flipFgV),
    options,
  );

  return new PhotonImage(result.data, result.width, result.height);
}
