import type { Color } from '@service-api/lib/types';

export const SORT_OPTIONS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'hue', label: 'Hue' },
  { key: 'saturation', label: 'Sat' },
  { key: 'lightness', label: 'Light' },
  { key: 'red', label: 'R' },
  { key: 'green', label: 'G' },
  { key: 'blue', label: 'B' },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['key'];
export type SortDir = 'asc' | 'desc';

export interface SortEntry {
  key: SortKey;
  dir: SortDir;
}

/**
 * Derives HSL from an RGB triple.
 * Returns hue in [0, 360), saturation in [0, 1], lightness in [0, 1].
 *
 * The Color API's own hue/saturation/lightness fields are transformation
 * modifiers applied to base_rgb, not the HSL of the final colour. This
 * function computes true HSL from the already-rendered cloth.rgb values.
 */
function rgbToHsl(rgb: [number, number, number]): { h: number; s: number; l: number } {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  return { h: h * 360, s, l };
}

/**
 * Measures how much a single RGB channel dominates the other two.
 * Result is positive when the channel is strong relative to the others,
 * zero for neutral greys, and negative when the channel is suppressed.
 *
 * e.g. rgb(255,0,0) → redness = 255 − 0   = +255
 *      rgb(128,128,128) → redness = 128 − 128 = 0
 *      rgb(0,255,0) → redness = 0 − 127.5 = −127.5
 */
function channelDominance(channel: number, other1: number, other2: number): number {
  return channel - (other1 + other2) / 2;
}

function compareByKey(a: Color, b: Color, key: SortKey): number {
  switch (key) {
    case 'id':
      return a.id - b.id;
    case 'name':
      return a.name.localeCompare(b.name);
    case 'hue':
      return rgbToHsl(a.cloth.rgb).h - rgbToHsl(b.cloth.rgb).h;
    case 'saturation':
      return rgbToHsl(a.cloth.rgb).s - rgbToHsl(b.cloth.rgb).s;
    case 'lightness':
      return rgbToHsl(a.cloth.rgb).l - rgbToHsl(b.cloth.rgb).l;
    // Dominance comparisons are inverted so that ascending = most dominant first,
    // which is the natural expectation when sorting a colour picker by hue channel.
    case 'red':
      return (
        channelDominance(b.cloth.rgb[0], b.cloth.rgb[1], b.cloth.rgb[2]) -
        channelDominance(a.cloth.rgb[0], a.cloth.rgb[1], a.cloth.rgb[2])
      );
    case 'green':
      return (
        channelDominance(b.cloth.rgb[1], b.cloth.rgb[0], b.cloth.rgb[2]) -
        channelDominance(a.cloth.rgb[1], a.cloth.rgb[0], a.cloth.rgb[2])
      );
    case 'blue':
      return (
        channelDominance(b.cloth.rgb[2], b.cloth.rgb[0], b.cloth.rgb[1]) -
        channelDominance(a.cloth.rgb[2], a.cloth.rgb[0], a.cloth.rgb[1])
      );
  }
}

export function sortColors(colors: Color[], sort: SortEntry | null): Color[] {
  if (!sort) return colors;
  return [...colors].sort((a, b) => {
    const cmp = compareByKey(a, b, sort.key);
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}
