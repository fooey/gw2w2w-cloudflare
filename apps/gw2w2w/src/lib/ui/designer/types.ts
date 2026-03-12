export type EmblemFlag =
  | 'FlipBackgroundHorizontal'
  | 'FlipBackgroundVertical'
  | 'FlipForegroundHorizontal'
  | 'FlipForegroundVertical';

export interface EmblemState {
  background: { id: number | null; colors: [number | null] };
  foreground: { id: number | null; colors: [number | null, number | null] };
  flags: EmblemFlag[];
}
