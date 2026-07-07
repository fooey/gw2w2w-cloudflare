import { isEmpty } from '@repo/utils/nullish';

export function allowedOrigin(origin: string | undefined, _host: string | undefined): string | undefined {
  if (isEmpty(origin)) return undefined; // Host is less reliable in dev, focus on Origin

  // Allow localhost origins regardless of what the 'host' header says
  if (origin.startsWith('http://localhost:')) return origin;

  // Production check
  if (origin === 'https://gw2w2w.com' || origin.endsWith('.gw2w2w.com')) return origin;

  return undefined;
}

export function allowedCsrf(origin: string | undefined, host: string | undefined): boolean {
  if (isEmpty(origin) || isEmpty(host)) return false;
  if (origin.startsWith('http://localhost') && host.startsWith('localhost')) return true;
  if (origin === 'https://gw2w2w.com' || origin.endsWith('.gw2w2w.com')) return true;
  return false;
}
