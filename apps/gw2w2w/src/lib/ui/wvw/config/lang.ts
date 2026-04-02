export const LANGS = ['en', 'de', 'es', 'fr'] as const;

export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'en';
