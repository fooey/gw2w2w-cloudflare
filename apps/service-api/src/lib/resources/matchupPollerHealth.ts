import { isNonEmptyString } from '@repo/utils';

import type { CloudflareEnv } from '#index.ts';

// Longer than MatchupPoller's own 20s alarm cadence so a single delayed/missed tick doesn't get
// flagged stale before the poller has had a fair chance to catch up — matches the threshold
// routes/wvw/stream.ts's /status endpoint already used before this was extracted.
export const POLL_STALE_THRESHOLD_MS = 100_000;

export interface MatchupPollerStatus {
  lastSuccessfulPollAt: string | null;
  consecutiveD1Errors: number;
  lastD1ErrorAt: string | null;
  [key: string]: unknown;
}

export interface MatchupPollerHealth {
  pollerStatus: MatchupPollerStatus | null;
  /** True when the poller hasn't confirmed fresh D1 data recently enough to trust an "absent" result. */
  pollIsStale: boolean;
}

/**
 * Milliseconds since an ISO timestamp, or Infinity if it's missing or unparseable — so "never
 * happened" and "too long ago" compare the same way. A malformed-but-present timestamp must also
 * resolve to Infinity, not NaN: NaN comparisons are always false, which would otherwise make an
 * invalid timestamp silently read as "fresh" instead of untrustworthy.
 */
function msSince(isoTimestamp: string | null | undefined): number {
  if (!isNonEmptyString(isoTimestamp)) return Number.POSITIVE_INFINITY;
  const ms = Date.now() - new Date(isoTimestamp).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/**
 * Reads the MatchupPoller DO's own /status (an internal DO fetch — never leaves Cloudflare's
 * network, so this costs nothing against the GW2 rate limit) and derives whether its D1 writes
 * can currently be trusted. The same fetch also wakes the DO if it was evicted, since any request
 * to the stub runs its constructor and reschedules its alarm if one isn't already pending.
 */
export async function getMatchupPollerHealth(env: CloudflareEnv): Promise<MatchupPollerHealth> {
  const stub = env.MATCHUP_POLLER.getByName('global');
  const response = await stub.fetch(new Request('https://internal/status'));

  let pollerStatus: MatchupPollerStatus | null = null;
  if (response.ok) {
    try {
      // The DO's own /status handler builds this shape — trusted, not external input.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion
      pollerStatus = (await response.json()) as MatchupPollerStatus;
    } catch {
      pollerStatus = null;
    }
  }

  const pollIsOld = msSince(pollerStatus?.lastSuccessfulPollAt) > POLL_STALE_THRESHOLD_MS;

  // lastSuccessfulPollAt is stamped right after the GW2 fetch succeeds, before the D1 write is even
  // attempted — a pure D1-write failure can leave it looking fresh while match_state never actually
  // got updated. An active run of recent D1 errors must also count as "can't be trusted".
  const hasActiveD1Errors =
    (pollerStatus?.consecutiveD1Errors ?? 0) > 0 && msSince(pollerStatus?.lastD1ErrorAt) < POLL_STALE_THRESHOLD_MS;

  return { pollerStatus, pollIsStale: pollIsOld || hasActiveD1Errors };
}
