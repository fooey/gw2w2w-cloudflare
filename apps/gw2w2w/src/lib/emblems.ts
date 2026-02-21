if (!process.env.NEXT_PUBLIC_SERVICE_EMBLEM_HOST) {
  throw new Error('NEXT_PUBLIC_SERVICE_EMBLEM_HOST environment variable is not set');
}

const emblemHost = process.env.NEXT_PUBLIC_SERVICE_EMBLEM_HOST;

export const getEmblemSrc = (guildId: string) => {
  return `${emblemHost}/${guildId}`;
};
