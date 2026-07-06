import { describe, expect, it, vi } from 'vitest';

import { MatchupPoller } from './MatchupPoller';

interface FakeStorage {
  getAlarm: ReturnType<typeof vi.fn<() => Promise<number | null | undefined>>>;
  setAlarm: ReturnType<typeof vi.fn<(value: number) => Promise<void>>>;
  alarm: number | null | undefined;
}

interface FakeState {
  storage: FakeStorage;
  blockConcurrencyWhile: <T>(callback: () => Promise<T>) => Promise<T>;
  waitUntil: ReturnType<typeof vi.fn<(promise: Promise<unknown>) => void>>;
}

interface FakeEnv {
  GW2_API_KEY?: string;
  GW2_API_BASE: string;
  WVW_DB: {
    prepare: ReturnType<typeof vi.fn>;
  };
}

function createHarness(initialAlarm: number | null | undefined): { state: FakeState; env: FakeEnv } {
  const storage: FakeStorage = {
    alarm: initialAlarm,
    getAlarm: vi.fn<() => Promise<number | null | undefined>>(async () => storage.alarm),
    setAlarm: vi.fn<(value: number) => Promise<void>>(async (value: number) => {
      storage.alarm = value;
    }),
  };

  const state: FakeState = {
    storage,
    blockConcurrencyWhile: async <T>(callback: () => Promise<T>) => callback(),
    waitUntil: vi.fn<(promise: Promise<unknown>) => void>(),
  };

  const env: FakeEnv = {
    GW2_API_BASE: 'https://api.guildwars2.com',
    WVW_DB: {
      prepare: vi.fn<() => { all: () => Promise<{ results: unknown[] }> }>(() => ({
        all: async () => ({ results: [] }),
      })),
    },
  };

  return { state, env };
}

async function flushConstructorWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('MatchupPoller constructor alarm scheduling', () => {
  it('schedules an alarm when existing alarm is undefined', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- createHarness's parameter is required, not optional.
    const { state, env } = createHarness(undefined);

    // eslint-disable-next-line no-new -- constructing triggers the alarm-scheduling side effect under test.
    new MatchupPoller(state as never, env as never);
    await flushConstructorWork();

    expect(state.storage.setAlarm).toHaveBeenCalledTimes(1);
    expect(state.storage.setAlarm.mock.calls[0]?.[0]).toStrictEqual(expect.any(Number));
  });

  it('does not reschedule when an alarm is already in the future', async () => {
    const { state, env } = createHarness(Date.now() + 60_000);

    // eslint-disable-next-line no-new -- constructing triggers the alarm-scheduling side effect under test.
    new MatchupPoller(state as never, env as never);
    await flushConstructorWork();

    expect(state.storage.setAlarm).not.toHaveBeenCalled();
  });
});

describe('MatchupPoller status endpoint alarm fields', () => {
  it('returns null ISO and non-stale when alarm is undefined', async () => {
    const { state, env } = createHarness(Date.now() + 60_000);
    const poller = new MatchupPoller(state as never, env as never);
    await flushConstructorWork();

    state.storage.alarm = undefined;

    const res = await poller.fetch(new Request('http://localhost/status'));
    const body = (await res.json()) as { nextAlarmAtISO: string | null; alarmIsStale: boolean };

    expect(res.status).toBe(200);
    expect(body.nextAlarmAtISO).toBeNull();
    expect(body.alarmIsStale).toBe(false);
  });

  it('reports stale alarm when next alarm is in the past', async () => {
    const { state, env } = createHarness(Date.now() + 60_000);
    const poller = new MatchupPoller(state as never, env as never);
    await flushConstructorWork();

    state.storage.alarm = Date.now() - 1000;

    const res = await poller.fetch(new Request('http://localhost/status'));
    const body = (await res.json()) as { alarmIsStale: boolean };

    expect(res.status).toBe(200);
    expect(body.alarmIsStale).toBe(true);
  });
});

describe('MatchupPoller alarm backoff', () => {
  it('uses Retry-After seconds to reschedule after 429', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'));

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('', {
          status: 429,
          headers: {
            'Retry-After': '30',
            'x-rate-limit-limit': '600',
          },
        }),
      )
      .mockResolvedValueOnce(new Response('ip=203.0.113.10\n', { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const { state, env } = createHarness(Date.now() + 60_000);
    env.GW2_API_KEY = 'test-key';

    const poller = new MatchupPoller(state as never, env as never);
    await flushConstructorWork();

    state.storage.setAlarm.mockClear();
    await poller.alarm();

    expect(state.storage.setAlarm).toHaveBeenCalledTimes(2);
    expect(state.storage.setAlarm.mock.calls[1]?.[0]).toBe(Date.now() + 30_000);

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('falls back to default backoff when Retry-After is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'));

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('', {
          status: 429,
          headers: {
            'x-rate-limit-limit': '600',
          },
        }),
      )
      .mockResolvedValueOnce(new Response('ip=203.0.113.10\n', { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const { state, env } = createHarness(Date.now() + 60_000);
    env.GW2_API_KEY = 'test-key';

    const poller = new MatchupPoller(state as never, env as never);
    await flushConstructorWork();

    state.storage.setAlarm.mockClear();
    await poller.alarm();

    expect(state.storage.setAlarm).toHaveBeenCalledTimes(2);
    expect(state.storage.setAlarm.mock.calls[1]?.[0]).toBe(Date.now() + 60_000);

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
