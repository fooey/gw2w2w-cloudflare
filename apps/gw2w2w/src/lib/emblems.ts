const EMBLEM_HOST_PRODUCTION = 'https://emblem.gw2w2w.com';
const EMBLEM_HOST_DEVELOPMENT = 'http://localhost:8787';

const emblemHost = process.env.NODE_ENV === 'production' ? EMBLEM_HOST_PRODUCTION : EMBLEM_HOST_DEVELOPMENT;

export const getEmblemSrc = (guildId: string) => {
  return `${emblemHost}/${guildId}`;
};
