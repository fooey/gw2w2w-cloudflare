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
        // Real Cache API implementations hand back an independently-readable response on every
        // match — clone here so a stored entry can be matched more than once without a
        // "body stream already read" error, same as production.
        match: async (req: Request) => store.get(req.url)?.clone() ?? null,
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

  it('serves the same cached entry across more than one subsequent hit', async () => {
    // Guards the test double itself: a naive mock that hands back the same Response instance on
    // every match() would fail here with a "body stream already read" error on the third call,
    // since each match's body must be independently readable in the real Cache API.
    const c = makeContext();
    await withCache(c as never, 20, async () => Response.json({ ok: true }));

    const hit1 = await withCache(c as never, 20, async () => Response.json({ ok: 'should not run' }));
    const hit2 = await withCache(c as never, 20, async () => Response.json({ ok: 'should not run either' }));

    await expect(hit1.clone().text()).resolves.toBe(JSON.stringify({ ok: true }));
    await expect(hit2.clone().text()).resolves.toBe(JSON.stringify({ ok: true }));
  });

  it('does not cache a non-ok response, and returns it without a Cache-Control header', async () => {
    const c = makeContext();
    const response = await withCache(c as never, 20, async () => Response.json({ error: true }, { status: 500 }));

    expect(response.headers.get('Cache-Control')).toBeNull();
    expect(store.size).toBe(0);
  });
});
