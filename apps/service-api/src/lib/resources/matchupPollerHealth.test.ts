import { describe, expect, it, vi } from 'vitest';

import { getMatchupPollerHealth, POLL_STALE_THRESHOLD_MS } from './matchupPollerHealth';

interface FakeEnv {
  MATCHUP_POLLER: {
    getByName: (name: string) => { fetch: ReturnType<typeof vi.fn<() => Promise<Response>>> };
  };
}

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function makeEnv(statusBody: unknown, ok = true): FakeEnv {
  const fetchMock = vi.fn<() => Promise<Response>>(async () => Response.json(statusBody, { status: ok ? 200 : 500 }));
  return { MATCHUP_POLLER: { getByName: () => ({ fetch: fetchMock }) } };
}

describe('getMatchupPollerHealth', () => {
  it('is healthy when the poller polled recently and has no D1 errors', async () => {
    const env = makeEnv({ lastSuccessfulPollAt: isoAgo(1000), consecutiveD1Errors: 0, lastD1ErrorAt: null });
    const { pollIsStale } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(false);
  });

  it('is stale when the poller has never successfully polled', async () => {
    const env = makeEnv({ lastSuccessfulPollAt: null, consecutiveD1Errors: 0, lastD1ErrorAt: null });
    const { pollIsStale } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(true);
  });

  it('is stale when the last successful poll is older than the threshold', async () => {
    const env = makeEnv({
      lastSuccessfulPollAt: isoAgo(POLL_STALE_THRESHOLD_MS + 1000),
      consecutiveD1Errors: 0,
      lastD1ErrorAt: null,
    });
    const { pollIsStale } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(true);
  });

  it('is stale when D1 writes are actively failing, even if the GW2 poll itself was recent', async () => {
    // lastSuccessfulPollAt is stamped before the D1 write is attempted, so a recent poll alone
    // isn't enough to trust match_state — an active run of D1 errors must override it.
    const env = makeEnv({
      lastSuccessfulPollAt: isoAgo(1000),
      consecutiveD1Errors: 3,
      lastD1ErrorAt: isoAgo(500),
    });
    const { pollIsStale } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(true);
  });

  it('is healthy when a past run of D1 errors is old enough to no longer count', async () => {
    const env = makeEnv({
      lastSuccessfulPollAt: isoAgo(1000),
      consecutiveD1Errors: 3,
      lastD1ErrorAt: isoAgo(POLL_STALE_THRESHOLD_MS + 1000),
    });
    const { pollIsStale } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(false);
  });

  it('is stale when the DO status fetch itself fails', async () => {
    const env = makeEnv(null, false);
    const { pollIsStale, pollerStatus } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(true);
    expect(pollerStatus).toBeNull();
  });

  it('is stale when lastSuccessfulPollAt is a non-empty but unparseable timestamp', async () => {
    // A malformed (not just missing) timestamp must still count as untrustworthy — Date.now() -
    // NaN is NaN, and NaN comparisons are always false, which would otherwise read as "fresh".
    const env = makeEnv({ lastSuccessfulPollAt: 'not-a-date', consecutiveD1Errors: 0, lastD1ErrorAt: null });
    const { pollIsStale } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(true);
  });

  it('does not count an unparseable lastD1ErrorAt as an active error', async () => {
    const env = makeEnv({
      lastSuccessfulPollAt: isoAgo(1000),
      consecutiveD1Errors: 3,
      lastD1ErrorAt: 'not-a-date',
    });
    const { pollIsStale } = await getMatchupPollerHealth(env as never);
    expect(pollIsStale).toBe(false);
  });
});
