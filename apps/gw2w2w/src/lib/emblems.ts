const emblemHost = process.env.NODE_ENV === 'production' ? 'https://emblem.gw2w2w.com' : 'http://localhost:8787';

export const getEmblemSrc = (guildId: string) => {
  return `${emblemHost}/${guildId}`;
};
