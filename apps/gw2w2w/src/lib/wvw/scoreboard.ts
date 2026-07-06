/** Kill/death ratio for display: fixed to 2 decimals, "∞" for kills with no deaths, "—" for no kills or deaths. */
export function formatKdr(kills: number, deaths: number): string {
  if (deaths > 0) return (kills / deaths).toFixed(2);
  return kills > 0 ? '∞' : '—';
}
