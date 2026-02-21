const getEmblemSrc = (guildId: string) => {
  if (!process.env.NEXT_PUBLIC_SERVICE_EMBLEM_HOST) {
    throw new Error('NEXT_PUBLIC_SERVICE_EMBLEM_HOST environment variable is not set');
  }

  return `${process.env.NEXT_PUBLIC_SERVICE_EMBLEM_HOST}/${guildId}`;
};

export { getEmblemSrc };
