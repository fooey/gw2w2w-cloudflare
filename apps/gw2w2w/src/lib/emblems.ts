import { DEFAULT_EMBLEM_SIZE, type EmblemSize } from '@repo/emblem-renderer/sizes';
import type { Guild } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';

import type { EmblemState } from '#ui/designer/types';

const EMBLEM_HOST_PRODUCTION = 'https://emblem.gw2w2w.com';
const EMBLEM_HOST_DEVELOPMENT = 'http://localhost:8787';

const emblemHost = process.env.NODE_ENV === 'production' ? EMBLEM_HOST_PRODUCTION : EMBLEM_HOST_DEVELOPMENT;

export const getEmblemSrc = (guildId: string, size?: EmblemSize) => {
  const url = `${emblemHost}/${guildId}`;
  return size !== undefined && size !== DEFAULT_EMBLEM_SIZE ? `${url}?size=${size}` : url;
};

export const getCustomEmblemSrc = (emblem: EmblemState, size?: EmblemSize) => {
  const qs = new URLSearchParams();
  if (isPresent(emblem.background.id)) qs.set('background_id', String(emblem.background.id));
  if (isPresent(emblem.background.colors[0])) qs.set('background_color_id', String(emblem.background.colors[0]));
  if (isPresent(emblem.foreground.id)) qs.set('foreground_id', String(emblem.foreground.id));
  if (isPresent(emblem.foreground.colors[0]))
    qs.set('foreground_primary_color_id', String(emblem.foreground.colors[0]));
  if (isPresent(emblem.foreground.colors[1]))
    qs.set('foreground_secondary_color_id', String(emblem.foreground.colors[1]));
  if (emblem.flags.includes('FlipBackgroundHorizontal')) qs.set('flags_flip_bg_horizontal', '');
  if (emblem.flags.includes('FlipBackgroundVertical')) qs.set('flags_flip_bg_vertical', '');
  if (emblem.flags.includes('FlipForegroundHorizontal')) qs.set('flags_flip_fg_horizontal', '');
  if (emblem.flags.includes('FlipForegroundVertical')) qs.set('flags_flip_fg_vertical', '');
  if (size !== undefined && size !== DEFAULT_EMBLEM_SIZE) qs.set('size', String(size));
  const query = qs.toString();
  return `${emblemHost}/custom${query ? `?${query}` : ''}`;
};

export const getDesignerSrc = (emblem: NonNullable<Guild['emblem']>) => {
  const qs = new URLSearchParams();
  qs.set('background_id', String(emblem.background.id));
  if (isPresent(emblem.background.colors[0])) qs.set('background_color_id', String(emblem.background.colors[0]));
  qs.set('foreground_id', String(emblem.foreground.id));
  if (isPresent(emblem.foreground.colors[0]))
    qs.set('foreground_primary_color_id', String(emblem.foreground.colors[0]));
  if (isPresent(emblem.foreground.colors[1]))
    qs.set('foreground_secondary_color_id', String(emblem.foreground.colors[1]));
  if (emblem.flags.includes('FlipBackgroundHorizontal')) qs.set('flags_flip_bg_horizontal', '');
  if (emblem.flags.includes('FlipBackgroundVertical')) qs.set('flags_flip_bg_vertical', '');
  if (emblem.flags.includes('FlipForegroundHorizontal')) qs.set('flags_flip_fg_horizontal', '');
  if (emblem.flags.includes('FlipForegroundVertical')) qs.set('flags_flip_fg_vertical', '');
  return `/designer?${qs.toString()}`;
};
