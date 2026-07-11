import { PhotonImage } from '@cf-wasm/photon';
import { describe, expect, it } from 'vitest';

import type { Color, Guild } from '@repo/service-api/types';

import type { ColorRGB } from './pixels';
import { renderEmblem, renderEmblemLayers, resizeEmblemImage } from './index';
import { IMAGE_DIMENSION } from './pixels';

function expectDefined<T>(value: T | undefined): T {
  expect(value).toBeDefined();
  if (value === undefined) throw new Error('Expected value to be defined');
  return value;
}

/** Encodes raw RGBA pixels as a real in-memory PNG, the same byte format decodeAndOrientLayer receives from R2. */
function pngBufferFromPixels(data: Uint8Array, width: number, height: number): ArrayBuffer {
  const encoded = new PhotonImage(data, width, height).get_bytes();
  return new Uint8Array(encoded).buffer;
}

function readPixel(raw: Uint8Array, width: number, x: number, y: number): ColorRGB {
  const i = (y * width + x) * 4;
  return [expectDefined(raw[i]), expectDefined(raw[i + 1]), expectDefined(raw[i + 2])];
}

function readAlpha(raw: Uint8Array, width: number, x: number, y: number): number {
  return expectDefined(raw[(y * width + x) * 4 + 3]);
}

function makeColor(id: number, rgb: ColorRGB): Color {
  const [r, g, b] = rgb;
  const material: Color['cloth'] = { brightness: 0, contrast: 0, hue: 0, saturation: 0, lightness: 0, rgb: [r, g, b] };
  return {
    id,
    name: `color-${id}`,
    base_rgb: [r, g, b],
    cloth: material,
    leather: material,
    metal: material,
    categories: [],
  };
}

/** 2x2 background layer; only the red channel (mask) matters, set here to distinct nonzero marker values per corner. */
function makeBgMaskBuffer(topLeft: number, topRight: number, bottomLeft: number, bottomRight: number): ArrayBuffer {
  const data = new Uint8Array([topLeft, 0, 0, 255, topRight, 0, 0, 255, bottomLeft, 0, 0, 255, bottomRight, 0, 0, 255]);
  return pngBufferFromPixels(data, 2, 2);
}

describe('resizeEmblemImage', () => {
  it('returns the same image reference when size equals IMAGE_DIMENSION', () => {
    const image = new PhotonImage(new Uint8Array(2 * 2 * 4), 2, 2);
    expect(resizeEmblemImage(image, IMAGE_DIMENSION)).toBe(image);
  });

  it('resizes to the requested EmblemSize when different from IMAGE_DIMENSION', () => {
    const image = new PhotonImage(new Uint8Array(2 * 2 * 4), 2, 2);
    const resized = resizeEmblemImage(image, 16);
    expect(resized).not.toBe(image);
    expect(resized.get_width()).toBe(16);
    expect(resized.get_height()).toBe(16);
  });
});

describe('renderEmblemLayers', () => {
  it('falls back to a transparent IMAGE_DIMENSION canvas when no background buffer is given', () => {
    const result = renderEmblemLayers(null, null, null, {
      bgRGB: [1, 2, 3],
      fg1RGB: [0, 0, 0],
      fg2RGB: [0, 0, 0],
    });
    expect(result.get_width()).toBe(IMAGE_DIMENSION);
    expect(result.get_height()).toBe(IMAGE_DIMENSION);
    expect(result.get_raw_pixels().every((byte) => byte === 0)).toBe(true);
  });

  it('decodes and composites the background layer with no flip flags', () => {
    const bgBuf = makeBgMaskBuffer(10, 20, 30, 40);
    const result = renderEmblemLayers(bgBuf, null, null, {
      flags: [],
      bgRGB: [0, 128, 255],
      fg1RGB: [0, 0, 0],
      fg2RGB: [0, 0, 0],
    });
    const raw = result.get_raw_pixels();
    expect(readAlpha(raw, 2, 0, 0)).toBe(10);
    expect(readAlpha(raw, 2, 1, 0)).toBe(20);
    expect(readAlpha(raw, 2, 0, 1)).toBe(30);
    expect(readAlpha(raw, 2, 1, 1)).toBe(40);
    expect(readPixel(raw, 2, 0, 0)).toStrictEqual([0, 128, 255]);
  });

  it('applies FlipBackgroundHorizontal before compositing', () => {
    const bgBuf = makeBgMaskBuffer(10, 20, 30, 40);
    const result = renderEmblemLayers(bgBuf, null, null, {
      flags: ['FlipBackgroundHorizontal'],
      bgRGB: [0, 0, 0],
      fg1RGB: [0, 0, 0],
      fg2RGB: [0, 0, 0],
    });
    const raw = result.get_raw_pixels();
    expect(readAlpha(raw, 2, 0, 0)).toBe(20);
    expect(readAlpha(raw, 2, 1, 0)).toBe(10);
    expect(readAlpha(raw, 2, 0, 1)).toBe(40);
    expect(readAlpha(raw, 2, 1, 1)).toBe(30);
  });

  it('applies FlipBackgroundVertical before compositing', () => {
    const bgBuf = makeBgMaskBuffer(10, 20, 30, 40);
    const result = renderEmblemLayers(bgBuf, null, null, {
      flags: ['FlipBackgroundVertical'],
      bgRGB: [0, 0, 0],
      fg1RGB: [0, 0, 0],
      fg2RGB: [0, 0, 0],
    });
    const raw = result.get_raw_pixels();
    expect(readAlpha(raw, 2, 0, 0)).toBe(30);
    expect(readAlpha(raw, 2, 1, 0)).toBe(40);
    expect(readAlpha(raw, 2, 0, 1)).toBe(10);
    expect(readAlpha(raw, 2, 1, 1)).toBe(20);
  });

  it('applies both background flip flags as a 180-degree rotation', () => {
    const bgBuf = makeBgMaskBuffer(10, 20, 30, 40);
    const result = renderEmblemLayers(bgBuf, null, null, {
      flags: ['FlipBackgroundHorizontal', 'FlipBackgroundVertical'],
      bgRGB: [0, 0, 0],
      fg1RGB: [0, 0, 0],
      fg2RGB: [0, 0, 0],
    });
    const raw = result.get_raw_pixels();
    expect(readAlpha(raw, 2, 0, 0)).toBe(40);
    expect(readAlpha(raw, 2, 1, 0)).toBe(30);
    expect(readAlpha(raw, 2, 0, 1)).toBe(20);
    expect(readAlpha(raw, 2, 1, 1)).toBe(10);
  });

  it('applies foreground flips before compositing over the background', () => {
    // Opaque bg everywhere so the composited color/alpha are fully determined by fg1's coverage.
    const bgBuf = makeBgMaskBuffer(255, 255, 255, 255);
    // fg1's alpha channel (not its own RGB) marks coverage; only its top-left corner is opaque
    // before the flip is applied. The composited color always comes from options.fg1RGB.
    const fg1Data = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const fg1Buf = pngBufferFromPixels(fg1Data, 2, 2);

    const result = renderEmblemLayers(bgBuf, fg1Buf, null, {
      flags: ['FlipForegroundHorizontal'],
      bgRGB: [10, 20, 30],
      fg1RGB: [200, 150, 100],
      fg2RGB: [0, 0, 0],
    });
    const raw = result.get_raw_pixels();
    // The opaque marker should have moved from top-left to top-right.
    expect(readPixel(raw, 2, 1, 0)).toStrictEqual([200, 150, 100]);
    expect(readPixel(raw, 2, 0, 0)).toStrictEqual([10, 20, 30]);
    expect(readPixel(raw, 2, 0, 1)).toStrictEqual([10, 20, 30]);
    expect(readPixel(raw, 2, 1, 1)).toStrictEqual([10, 20, 30]);
  });
});

describe('renderEmblem', () => {
  it('throws NoEmblemData when the guild has no emblem configured', () => {
    const noEmblem: Guild['emblem'] = undefined;
    expect(() => renderEmblem(noEmblem, [], null, null, null)).toThrow('NoEmblemData');
  });

  it('maps the background color from the guild colors palette', () => {
    const emblem: Guild['emblem'] = {
      background: { id: 1, colors: [5] },
      foreground: { id: 1, colors: [] },
      flags: [],
    };
    const colors: Color[] = [makeColor(5, [9, 8, 7])];
    const bgBuf = makeBgMaskBuffer(255, 255, 255, 255);

    const result = renderEmblem(emblem, colors, bgBuf, null, null);
    const raw = result.get_raw_pixels();
    expect(readPixel(raw, 2, 0, 0)).toStrictEqual([9, 8, 7]);
  });

  it('maps foreground colors from the guild colors palette', () => {
    const emblem: Guild['emblem'] = {
      background: { id: 1, colors: [5] },
      foreground: { id: 1, colors: [6] },
      flags: [],
    };
    const colors: Color[] = [makeColor(5, [10, 20, 30]), makeColor(6, [200, 150, 100])];
    const bgBuf = makeBgMaskBuffer(255, 255, 255, 255);
    const fg1Data = new Uint8Array(2 * 2 * 4).fill(255);
    const fg1Buf = pngBufferFromPixels(fg1Data, 2, 2);

    const result = renderEmblem(emblem, colors, bgBuf, fg1Buf, null);
    const raw = result.get_raw_pixels();
    // fg1 is fully opaque everywhere, so it fully covers the mapped background color.
    expect(readPixel(raw, 2, 0, 0)).toStrictEqual([200, 150, 100]);
  });

  it('falls back to red when a referenced color id is missing from the palette', () => {
    const emblem: Guild['emblem'] = {
      background: { id: 1, colors: [999] },
      foreground: { id: 1, colors: [] },
      flags: [],
    };
    const bgBuf = makeBgMaskBuffer(255, 255, 255, 255);

    const result = renderEmblem(emblem, [], bgBuf, null, null);
    const raw = result.get_raw_pixels();
    expect(readPixel(raw, 2, 0, 0)).toStrictEqual([255, 0, 0]);
  });
});
