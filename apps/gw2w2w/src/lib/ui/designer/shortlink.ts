import type { EmblemFlag, EmblemState } from './types';

/**
 * Compact base62 shortlink encoding for emblem state.
 *
 * Layout (11 chars total):
 *   [00-01]  background id   (2 chars, 0 = unset)
 *   [02-03]  background color id  (2 chars, 0 = unset)
 *   [04-05]  foreground id   (2 chars, 0 = unset)
 *   [06-07]  foreground color 1   (2 chars, 0 = unset)
 *   [08-09]  foreground color 2   (2 chars, 0 = unset)
 *   [10]     flags nibble    (1 char, bits 0-3)
 *
 * Each 2-char field supports values 0–3843, which exceeds all current GW2 IDs.
 * Null/unset is stored as 0 (GW2 IDs start at 1).
 */

const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = CHARS.length; // 62

function b62Encode(n: number, width: number): string {
  let s = '';
  for (let i = 0; i < width; i++) {
    s = (CHARS[n % BASE] ?? '0') + s;
    n = Math.floor(n / BASE);
  }
  return s;
}

function b62Decode(s: string): number {
  let n = 0;
  for (const c of s) {
    n = n * BASE + CHARS.indexOf(c);
  }
  return n;
}

const FLAG_BITS: Record<EmblemFlag, number> = {
  FlipBackgroundHorizontal: 1,
  FlipBackgroundVertical: 2,
  FlipForegroundHorizontal: 4,
  FlipForegroundVertical: 8,
};

const ALL_FLAGS = Object.keys(FLAG_BITS) as EmblemFlag[];

export const SHORTLINK_LENGTH = 11;

export function encodeShortlink(state: EmblemState): string {
  const flagBits = state.flags.reduce((acc, f) => acc | FLAG_BITS[f], 0);
  return (
    b62Encode(state.background.id ?? 0, 2) +
    b62Encode(state.background.colors[0] ?? 0, 2) +
    b62Encode(state.foreground.id ?? 0, 2) +
    b62Encode(state.foreground.colors[0] ?? 0, 2) +
    b62Encode(state.foreground.colors[1] ?? 0, 2) +
    b62Encode(flagBits, 1)
  );
}

export function decodeShortlink(s: string): EmblemState | null {
  if (s.length !== SHORTLINK_LENGTH) return null;
  const bgId = b62Decode(s.slice(0, 2));
  const bgc = b62Decode(s.slice(2, 4));
  const fgId = b62Decode(s.slice(4, 6));
  const fgc1 = b62Decode(s.slice(6, 8));
  const fgc2 = b62Decode(s.slice(8, 10));
  const flagBits = b62Decode(s.slice(10, 11));
  const flags = ALL_FLAGS.filter((f) => (flagBits & FLAG_BITS[f]) !== 0);
  return {
    background: { id: bgId || null, colors: [bgc || null] },
    foreground: { id: fgId || null, colors: [fgc1 || null, fgc2 || null] },
    flags,
  };
}
