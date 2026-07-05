import { describe, expect, it } from 'vitest';
import { getFlipsFromFlags, IMAGE_DIMENSION, renderEmblemPixels } from './pixels';

function expectDefined<T>(value: T | undefined): T {
  expect(value).toBeDefined();
  if (value === undefined) throw new Error('Expected value to be defined');
  return value;
}

describe('IMAGE_DIMENSION', () => {
  it('is 128', () => {
    expect(IMAGE_DIMENSION).toBe(128);
  });
});

describe('getFlipsFromFlags', () => {
  it('returns all false with no flags', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- getFlipsFromFlags's parameter is required, not optional.
    expect(getFlipsFromFlags(undefined)).toEqual({
      flipBgH: false,
      flipBgV: false,
      flipFgH: false,
      flipFgV: false,
    });
  });
  it('returns all false with empty flags array', () => {
    expect(getFlipsFromFlags([])).toEqual({
      flipBgH: false,
      flipBgV: false,
      flipFgH: false,
      flipFgV: false,
    });
  });
  it('sets the correct flip booleans', () => {
    expect(getFlipsFromFlags(['FlipBackgroundHorizontal', 'FlipForegroundVertical'])).toEqual({
      flipBgH: true,
      flipBgV: false,
      flipFgH: false,
      flipFgV: true,
    });
  });
  it('handles all four flags', () => {
    expect(
      getFlipsFromFlags([
        'FlipBackgroundHorizontal',
        'FlipBackgroundVertical',
        'FlipForegroundHorizontal',
        'FlipForegroundVertical',
      ]),
    ).toEqual({ flipBgH: true, flipBgV: true, flipFgH: true, flipFgV: true });
  });
});

describe('renderEmblemPixels', () => {
  it('returns an IMAGE_DIMENSION x IMAGE_DIMENSION transparent buffer when all layers are null', () => {
    const result = renderEmblemPixels(null, null, null, {
      bgRGB: [255, 0, 0],
      fg1RGB: [0, 255, 0],
      fg2RGB: [0, 0, 255],
    });
    expect(result.width).toBe(IMAGE_DIMENSION);
    expect(result.height).toBe(IMAGE_DIMENSION);
    expect(result.data).toHaveLength(IMAGE_DIMENSION * IMAGE_DIMENSION * 4);
    // All pixels should be transparent (no background layer)
    expect(result.u32.every((px) => px === 0)).toBe(true);
  });

  it('applies background color via red-channel mask', () => {
    const size = IMAGE_DIMENSION * IMAGE_DIMENSION;
    const data = new Uint8Array(size * 4);
    // Set every pixel's red channel (the mask) to 255 — fully opaque
    for (let i = 0; i < size; i++) data[i * 4] = 255;
    const u32 = new Uint32Array(data.buffer);
    const bg = { data, u32, width: IMAGE_DIMENSION, height: IMAGE_DIMENSION };

    const result = renderEmblemPixels(bg, null, null, {
      bgRGB: [0, 128, 255],
      fg1RGB: [0, 0, 0],
      fg2RGB: [0, 0, 0],
    });

    // With mask = 255, the output pixel should carry bgRGB values
    // RGBA layout in u32 (little-endian): a<<24 | b<<16 | g<<8 | r
    const pixel = expectDefined(result.u32[0]);
    const r = pixel & 0xff;
    const g = (pixel >> 8) & 0xff;
    const b = (pixel >> 16) & 0xff;
    expect(r).toBe(0);
    expect(g).toBe(128);
    expect(b).toBe(255);
  });
});
