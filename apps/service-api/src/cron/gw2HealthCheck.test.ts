import { afterEach, describe, expect, it, vi } from 'vitest';

import { GW2_DIRECT_UNHEALTHY_KV_KEY, GW2_PROXY_UNHEALTHY_KV_KEY } from '#lib/resources/gw2Fetch.ts';

import { checkGw2Health } from './gw2HealthCheck';

interface FakeEnv {
  GW2_API_BASE: string;
  GW2_PROXY_BASE: string;
  GW2_PROXY_SHARED_KEY?: string;
  EMBLEM_ENGINE_GUILD_LOOKUP: {
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

function createEnv(): FakeEnv {
  return {
    GW2_API_BASE: 'https://api.guildwars2.com/v2',
    GW2_PROXY_BASE: 'https://czt-proxy.gw2w2w.com/v2',
    GW2_PROXY_SHARED_KEY: 'test-proxy-key',
    EMBLEM_ENGINE_GUILD_LOOKUP: {
      put: vi.fn<() => Promise<void>>(async () => {}),
      delete: vi.fn<() => Promise<void>>(async () => {}),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkGw2Health', () => {
  it('clears the circuit-breaker key for a healthy endpoint', async () => {
    const env = createEnv();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 })));

    await checkGw2Health(env as never);

    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.delete).toHaveBeenCalledWith(GW2_DIRECT_UNHEALTHY_KV_KEY);
    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.delete).toHaveBeenCalledWith(GW2_PROXY_UNHEALTHY_KV_KEY);
    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.put).not.toHaveBeenCalled();
  });

  it('marks an endpoint unhealthy on a 429', async () => {
    const env = createEnv();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429 })));

    await checkGw2Health(env as never);

    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.put).toHaveBeenCalledWith(GW2_DIRECT_UNHEALTHY_KV_KEY, expect.any(String), {
      expirationTtl: 300,
    });
    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.put).toHaveBeenCalledWith(GW2_PROXY_UNHEALTHY_KV_KEY, expect.any(String), {
      expirationTtl: 300,
    });
    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.delete).not.toHaveBeenCalled();
  });

  it('marks an endpoint unhealthy on a 503, not just a 429', async () => {
    const env = createEnv();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 })));

    await checkGw2Health(env as never);

    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.put).toHaveBeenCalledWith(GW2_DIRECT_UNHEALTHY_KV_KEY, expect.any(String), {
      expirationTtl: 300,
    });
    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.put).toHaveBeenCalledWith(GW2_PROXY_UNHEALTHY_KV_KEY, expect.any(String), {
      expirationTtl: 300,
    });
    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.delete).not.toHaveBeenCalled();
  });

  it('marks an endpoint unhealthy when the probe itself throws (network error, timeout)', async () => {
    const env = createEnv();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('network down')));

    await checkGw2Health(env as never);

    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.put).toHaveBeenCalledWith(GW2_DIRECT_UNHEALTHY_KV_KEY, expect.any(String), {
      expirationTtl: 300,
    });
    expect(env.EMBLEM_ENGINE_GUILD_LOOKUP.put).toHaveBeenCalledWith(GW2_PROXY_UNHEALTHY_KV_KEY, expect.any(String), {
      expirationTtl: 300,
    });
  });

  it('sends X-Proxy-Key only on the proxy probe, never the direct one', async () => {
    const env = createEnv();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await checkGw2Health(env as never);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    const directCall = calls.find(([url]) => new URL(url).hostname === 'api.guildwars2.com');
    const proxyCall = calls.find(([url]) => new URL(url).hostname === 'czt-proxy.gw2w2w.com');

    expect(directCall?.[1].headers).not.toHaveProperty('X-Proxy-Key');
    expect(proxyCall?.[1].headers).toMatchObject({ 'X-Proxy-Key': 'test-proxy-key' });
  });
});
