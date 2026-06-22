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
    getAlarm: vi.fn(() => Promise.resolve(storage.alarm)),
    setAlarm: vi.fn((value: number) => {
      storage.alarm = value;
      return Promise.resolve();
    }),
  };

  const state: FakeState = {
    storage,
    blockConcurrencyWhile: async <T>(callback: () => Promise<T>) => callback(),
    waitUntil: vi.fn(),
  };

  const env: FakeEnv = {
    GW2_API_BASE: 'https://api.guildwars2.com',
    WVW_DB: {
      prepare: vi.fn(() => ({
        all: () => Promise.resolve({ results: [] }),
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
    const { state, env } = createHarness(undefined);

    new MatchupPoller(state as never, env as never);
    await flushConstructorWork();

    expect(state.storage.setAlarm).toHaveBeenCalledTimes(1);
    expect(state.storage.setAlarm.mock.calls[0]?.[0]).toEqual(expect.any(Number));
  });

  it('does not reschedule when an alarm is already in the future', async () => {
    const { state, env } = createHarness(Date.now() + 60_000);

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

    state.storage.alarm = Date.now() - 1_000;

    const res = await poller.fetch(new Request('http://localhost/status'));
    const body = (await res.json()) as { alarmIsStale: boolean };

    expect(res.status).toBe(200);
    expect(body.alarmIsStale).toBe(true);
  });
});
