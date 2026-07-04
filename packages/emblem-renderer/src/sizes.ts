export const EMBLEM_SIZES = [16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024] as const;
export type EmblemSize = (typeof EMBLEM_SIZES)[number];
export const DEFAULT_EMBLEM_SIZE: EmblemSize = 128;

export function isEmblemSize(n: number): n is EmblemSize {
  return EMBLEM_SIZES.some((s) => s === n);
}
