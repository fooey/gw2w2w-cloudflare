export function getEtaDisplay(
  yaksRequired: number,
  yaksDelivered: number,
  lastFlipped: string | null | undefined,
  now: Temporal.Instant | null | undefined,
): string | null {
  if (!now || !lastFlipped || yaksDelivered === 0) return null;
  const elapsedSeconds = Math.max(0, Math.floor(Temporal.Instant.from(lastFlipped).until(now).total('seconds')));
  const remaining = yaksRequired - yaksDelivered;
  if (remaining <= 0 || elapsedSeconds === 0) return null;
  const yaksPerSecond = yaksDelivered / elapsedSeconds;
  const etaSeconds = Math.ceil(remaining / yaksPerSecond);
  const totalMins = Math.ceil(etaSeconds / 60);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hours > 0 ? `~${hours.toString()}h ${mins.toString()}m` : `~${totalMins.toString()}m`;
}

export function formatRelative(isoString: string, now: Temporal.Instant | null | undefined): string {
  if (!now) return '';
  const diffSecs = Math.floor(Temporal.Instant.from(isoString).until(now).total('seconds'));
  const mins = Math.floor(diffSecs / 60);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins.toString()}m ago`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours.toString()}h ${rem.toString()}m ago` : `${hours.toString()}h ago`;
}

export function formatLocalized(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
