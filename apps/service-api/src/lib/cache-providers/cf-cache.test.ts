import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withCache } from './cf-cache';

interface FakeContext {
  req: { raw: Request };
  executionCtx: { waitUntil: ReturnType<typeof vi.fn<(promise: Promise<unknown>) => void>> };
}

function makeContext(url = 'https://example.test/foo'): FakeContext {
  return {
    req: { raw: new Request(url) },
    executionCtx: { waitUntil: vi.fn<(promise: Promise<unknown>) => void>() },
  };
}

describe('withCache', () => {
  let store: Map<string, Response>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('caches', {
      open: async () => ({
        match: async (req: Request) => store.get(req.url) ?? null,
        put: async (req: Request, res: Response) => {
          store.set(req.url, res);
        },
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets Cache-Control on the cache-miss response, not just the stored copy', async () => {
    const c = makeContext();
    const response = await withCache(c as never, 20, async () => Response.json({ ok: true }));

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=20');
    // Compared as serialized text, not a parsed object, so this doesn't depend on Response.json()
    // producing an object tied to the same realm as this test file (the vmForks pool this project
    // uses runs each test file in its own VM context, which toStrictEqual's prototype check cares
    // about but the actual response payload does not).
    await expect(response.clone().text()).resolves.toBe(JSON.stringify({ ok: true }));
  });

  it('sets the same Cache-Control on a subsequent cache hit', async () => {
    const c = makeContext();
    await withCache(c as never, 20, async () => Response.json({ ok: true }));

    const hit = await withCache(c as never, 20, async () => Response.json({ ok: 'should not run' }));

    expect(hit.headers.get('Cache-Control')).toBe('public, max-age=20');
    await expect(hit.clone().text()).resolves.toBe(JSON.stringify({ ok: true }));
  });

  it('does not cache a non-ok response, and returns it without a Cache-Control header', async () => {
    const c = makeContext();
    const response = await withCache(c as never, 20, async () => Response.json({ error: true }, { status: 500 }));

    expect(response.headers.get('Cache-Control')).toBeNull();
    expect(store.size).toBe(0);
  });
});
