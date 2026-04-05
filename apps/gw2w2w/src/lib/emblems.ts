import { type EmblemState } from '@gw2w2w/ui/designer/types';
import { type Guild } from '@service-api/lib/types';

const EMBLEM_HOST_PRODUCTION = 'https://emblem.gw2w2w.com';
const EMBLEM_HOST_DEVELOPMENT = 'http://localhost:8787';

const emblemHost = process.env.NODE_ENV === 'production' ? EMBLEM_HOST_PRODUCTION : EMBLEM_HOST_DEVELOPMENT;

export const getEmblemSrc = (guildId: string) => {
  return `${emblemHost}/${guildId}`;
};

export const getCustomEmblemSrc = (emblem: EmblemState) => {
  const qs = new URLSearchParams();
  if (emblem.background.id != null) qs.set('background_id', String(emblem.background.id));
  if (emblem.background.colors[0] != null) qs.set('background_color_id', String(emblem.background.colors[0]));
  if (emblem.foreground.id != null) qs.set('foreground_id', String(emblem.foreground.id));
  if (emblem.foreground.colors[0] != null) qs.set('foreground_primary_color_id', String(emblem.foreground.colors[0]));
  if (emblem.foreground.colors[1] != null) qs.set('foreground_secondary_color_id', String(emblem.foreground.colors[1]));
  if (emblem.flags.includes('FlipBackgroundHorizontal')) qs.set('flags_flip_bg_horizontal', '');
  if (emblem.flags.includes('FlipBackgroundVertical')) qs.set('flags_flip_bg_vertical', '');
  if (emblem.flags.includes('FlipForegroundHorizontal')) qs.set('flags_flip_fg_horizontal', '');
  if (emblem.flags.includes('FlipForegroundVertical')) qs.set('flags_flip_fg_vertical', '');
  const query = qs.toString();
  return `${emblemHost}/custom${query ? `?${query}` : ''}`;
};

export const getDesignerSrc = (emblem: NonNullable<Guild['emblem']>) => {
  const qs = new URLSearchParams();
  qs.set('background_id', String(emblem.background.id));
  if (emblem.background.colors[0] != null) qs.set('background_color_id', String(emblem.background.colors[0]));
  qs.set('foreground_id', String(emblem.foreground.id));
  if (emblem.foreground.colors[0] != null) qs.set('foreground_primary_color_id', String(emblem.foreground.colors[0]));
  if (emblem.foreground.colors[1] != null) qs.set('foreground_secondary_color_id', String(emblem.foreground.colors[1]));
  if (emblem.flags.includes('FlipBackgroundHorizontal')) qs.set('flags_flip_bg_horizontal', '');
  if (emblem.flags.includes('FlipBackgroundVertical')) qs.set('flags_flip_bg_vertical', '');
  if (emblem.flags.includes('FlipForegroundHorizontal')) qs.set('flags_flip_fg_horizontal', '');
  if (emblem.flags.includes('FlipForegroundVertical')) qs.set('flags_flip_fg_vertical', '');
  return `/designer?${qs.toString()}`;
};
