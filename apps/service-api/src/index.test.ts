import { describe, expect, it } from 'vitest';

import worker from './index';

describe('service-api smoke tests', () => {
  it('GET /robots.txt returns 200 text/plain', async () => {
    const res = await worker.fetch(new Request('http://localhost/robots.txt'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('GET /favicon.ico returns 404', async () => {
    const res = await worker.fetch(new Request('http://localhost/favicon.ico'));
    expect(res.status).toBe(404);
  });

  it('GET unknown route returns 404 JSON with expected shape', async () => {
    const res = await worker.fetch(new Request('http://localhost/does-not-exist'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('statusCode', 404);
    expect(body).toHaveProperty('service', 'service-api');
  });
});
