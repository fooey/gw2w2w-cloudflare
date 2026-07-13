import { afterEach, describe, expect, it, vi } from 'vitest';

import { GW2_DIRECT_UNHEALTHY_KV_KEY, GW2_PROXY_UNHEALTHY_KV_KEY, getGw2Health, gw2Fetch } from './gw2Fetch';

interface FakeEnv {
  GW2_API_BASE: string;
  GW2_PROXY_BASE: string;
  GW2_PROXY_SHARED_KEY?: string;
  EMBLEM_ENGINE_GUILD_LOOKUP: {
    get: ReturnType<typeof vi.fn<(key: string) => Promise<string | null>>>;
  };
}

function createEnv(kvValues: { direct?: string | null; proxy?: string | null } = {}): FakeEnv {
  const { direct = null, proxy = null } = kvValues;
  return {
    GW2_API_BASE: 'https://api.guildwars2.com/v2',
    GW2_PROXY_BASE: 'https://czt-proxy.gw2w2w.com/v2',
    GW2_PROXY_SHARED_KEY: 'test-proxy-key',
    EMBLEM_ENGINE_GUILD_LOOKUP: {
      get: vi.fn<(key: string) => Promise<string | null>>(async (key) => {
        if (key === GW2_DIRECT_UNHEALTHY_KV_KEY) return direct;
        if (key === GW2_PROXY_UNHEALTHY_KV_KEY) return proxy;
        return null;
      }),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getGw2Health', () => {
  it('reports healthy when no circuit-breaker key is set', async () => {
    const env = createEnv();
    await expect(getGw2Health(env as never)).resolves.toStrictEqual({ directHealthy: true, proxyHealthy: true });
  });

  it('reports unhealthy when the stored unhealthy-until timestamp is in the future', async () => {
    const future = String(Date.now() + 60_000);
    const env = createEnv({ direct: future, proxy: future });
    await expect(getGw2Health(env as never)).resolves.toStrictEqual({ directHealthy: false, proxyHealthy: false });
  });

  it('reports healthy again once the stored timestamp is in the past', async () => {
    const past = String(Date.now() - 1000);
    const env = createEnv({ direct: past, proxy: past });
    await expect(getGw2Health(env as never)).resolves.toStrictEqual({ directHealthy: true, proxyHealthy: true });
  });
});

describe('gw2Fetch', () => {
  it('returns the direct response directly when it succeeds', async () => {
    const env = createEnv();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await gw2Fetch(env as never, '/build', { headers: { 'User-Agent': 'gw2w2w.com' } });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.toString()).toBe('https://api.guildwars2.com/v2/build');
  });

  it('strips X-Proxy-Key from the direct attempt even if a caller mistakenly included it', async () => {
    const env = createEnv();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await gw2Fetch(env as never, '/build', {
      headers: { 'User-Agent': 'gw2w2w.com', 'X-Proxy-Key': 'leaked-by-mistake' },
    });

    const [, directInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(new Headers(directInit.headers).has('X-Proxy-Key')).toBe(false);
  });

  it('falls back to the proxy when direct returns 429, adding X-Proxy-Key only on the proxy attempt', async () => {
    const env = createEnv();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await gw2Fetch(env as never, '/build', { headers: { 'User-Agent': 'gw2w2w.com' } });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [directUrl, directInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(directUrl.toString()).toBe('https://api.guildwars2.com/v2/build');
    expect(new Headers(directInit.headers).has('X-Proxy-Key')).toBe(false);

    const [proxyUrl, proxyInit] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(proxyUrl.toString()).toBe('https://czt-proxy.gw2w2w.com/v2/build');
    expect(new Headers(proxyInit.headers).get('X-Proxy-Key')).toBe('test-proxy-key');
  });

  it("returns direct's 429 response when the proxy also fails outright, instead of throwing", async () => {
    const env = createEnv();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockRejectedValueOnce(new Error('proxy unreachable'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await gw2Fetch(env as never, '/build', { headers: { 'User-Agent': 'gw2w2w.com' } });

    expect(response.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the proxy when the direct fetch throws outright', async () => {
    const env = createEnv();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await gw2Fetch(env as never, '/build', { headers: { 'User-Agent': 'gw2w2w.com' } });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [proxyUrl] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(proxyUrl.toString()).toBe('https://czt-proxy.gw2w2w.com/v2/build');
  });

  it('skips straight to the proxy when direct is already marked unhealthy', async () => {
    const env = createEnv({ direct: String(Date.now() + 60_000) });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await gw2Fetch(env as never, '/build', { headers: { 'User-Agent': 'gw2w2w.com' } });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.toString()).toBe('https://czt-proxy.gw2w2w.com/v2/build');
  });

  it("returns direct's 429 immediately, without attempting the proxy, when the proxy is already marked unhealthy", async () => {
    const env = createEnv({ proxy: String(Date.now() + 60_000) });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await gw2Fetch(env as never, '/build', { headers: { 'User-Agent': 'gw2w2w.com' } });

    expect(response.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prefers direct's 429 over a less-useful proxy failure (5xx) when the proxy is attempted anyway", async () => {
    const env = createEnv();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('bad gateway', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await gw2Fetch(env as never, '/build', { headers: { 'User-Agent': 'gw2w2w.com' } });

    expect(response.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
