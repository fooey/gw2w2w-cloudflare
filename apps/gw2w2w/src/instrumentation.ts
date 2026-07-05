/**
 * Next.js instrumentation hook — runs once in the server runtime on startup.
 * Installs the Temporal polyfill so SSR code can use the Temporal global,
 * which is native in modern browsers but absent from Node.js / workerd.
 */
export async function register() {
  const { Temporal, Intl, toTemporalInstant } = await import('@js-temporal/polyfill');

  // Only install if not already present (workerd may gain native Temporal later).
  if (globalThis.Temporal === undefined) {
    Object.assign(globalThis, { Temporal, Intl, toTemporalInstant });
  }
}
