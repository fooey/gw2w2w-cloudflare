import { describe, expect, it } from 'vitest';

import { formatLocalized, formatRelative, getEtaDisplay } from './utils';

const now = Temporal.Instant.from('2026-06-22T12:00:00Z');

describe('getEtaDisplay', () => {
  it('returns an "~Xh Ym" estimate when the ETA is an hour or more away', () => {
    // 1 hour elapsed, 50/100 yaks delivered → 50 yaks remaining at the same rate → another 1h.
    const lastFlipped = '2026-06-22T11:00:00.000Z';
    expect(getEtaDisplay(100, 50, lastFlipped, now)).toBe('~1h 0m');
  });

  it('returns an "~Xm" estimate (no hours) when the ETA is under an hour away', () => {
    // 1 hour elapsed, 90/100 yaks delivered → 10 remaining at the same rate → ~7 minutes.
    const lastFlipped = '2026-06-22T11:00:00.000Z';
    expect(getEtaDisplay(100, 90, lastFlipped, now)).toBe('~7m');
  });

  it('returns null when now is nil', () => {
    const lastFlipped = '2026-06-22T11:00:00.000Z';
    expect(getEtaDisplay(100, 50, lastFlipped, null)).toBeNull();
    // eslint-disable-next-line unicorn/no-useless-undefined -- deliberately testing undefined, not just null
    expect(getEtaDisplay(100, 50, lastFlipped, undefined)).toBeNull();
  });

  it('returns null when lastFlipped is nil', () => {
    expect(getEtaDisplay(100, 50, null, now)).toBeNull();
    expect(getEtaDisplay(100, 50, undefined, now)).toBeNull();
  });

  it('returns null when no yaks have been delivered yet', () => {
    const lastFlipped = '2026-06-22T11:00:00.000Z';
    expect(getEtaDisplay(100, 0, lastFlipped, now)).toBeNull();
  });

  it('returns null when the tier requirement is already met or exceeded', () => {
    const lastFlipped = '2026-06-22T11:00:00.000Z';
    expect(getEtaDisplay(100, 100, lastFlipped, now)).toBeNull();
    expect(getEtaDisplay(100, 110, lastFlipped, now)).toBeNull();
  });

  it('returns null when no time has elapsed since lastFlipped', () => {
    const lastFlipped = '2026-06-22T12:00:00.000Z';
    expect(getEtaDisplay(100, 50, lastFlipped, now)).toBeNull();
  });
});

describe('formatRelative', () => {
  it('returns "just now" for a diff under a minute', () => {
    expect(formatRelative('2026-06-22T11:59:45.000Z', now)).toBe('just now');
  });

  it('returns "Xm ago" for a diff under an hour', () => {
    expect(formatRelative('2026-06-22T11:45:00.000Z', now)).toBe('15m ago');
  });

  it('returns "Xh ago" for a whole-hour diff with no leftover minutes', () => {
    expect(formatRelative('2026-06-22T10:00:00.000Z', now)).toBe('2h ago');
  });

  it('returns "Xh Ym ago" for an hour-plus diff with leftover minutes', () => {
    expect(formatRelative('2026-06-22T09:45:00.000Z', now)).toBe('2h 15m ago');
  });

  it('returns an empty string when now is nil', () => {
    expect(formatRelative('2026-06-22T11:45:00.000Z', null)).toBe('');
    // eslint-disable-next-line unicorn/no-useless-undefined -- deliberately testing undefined, not just null
    expect(formatRelative('2026-06-22T11:45:00.000Z', undefined)).toBe('');
  });
});

describe('formatLocalized', () => {
  it('formats an ISO timestamp as a plausible localized time string', () => {
    expect(formatLocalized('2026-06-22T11:45:00.000Z')).toMatch(/\d{1,2}[.:]\d{2}/u);
  });

  it('formats different timestamps differently', () => {
    expect(formatLocalized('2026-06-22T11:45:00.000Z')).not.toBe(formatLocalized('2026-06-22T09:15:00.000Z'));
  });
});
