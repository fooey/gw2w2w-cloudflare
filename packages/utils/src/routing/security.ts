export function allowedOrigin(origin: string | undefined, host: string | undefined): string | undefined {
  if (!origin || !host) return undefined;
  if (origin.startsWith('http://localhost') && host.startsWith('localhost')) return origin;
  if (origin === 'https://gw2w2w.com' || origin.endsWith('.gw2w2w.com')) return origin;
  return undefined;
}

export function allowedCsrf(origin: string | undefined, host: string | undefined): boolean {
  if (!origin || !host) return false;
  if (origin.startsWith('http://localhost') && host.startsWith('localhost')) return true;
  if (origin === 'https://gw2w2w.com' || origin.endsWith('.gw2w2w.com')) return true;
  return false;
}
