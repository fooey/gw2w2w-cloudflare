import { describe, expect, it } from 'vitest';
import app from './index';

describe('service-emblem smoke tests', () => {
  it('GET /robots.txt returns 200 text/plain', async () => {
    const res = await app.request('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('GET /favicon.ico redirects', async () => {
    const res = await app.request('/favicon.ico');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('97C007DC-87D5-E311-9621-AC162DAE8ACD');
  });
});
