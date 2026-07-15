import { describe, expect, it } from 'vitest';

import { interpretErrorStatus } from './matches';

describe('interpretErrorStatus', () => {
  it('treats 404 as not_found', () => {
    expect(interpretErrorStatus(404, new Headers())).toStrictEqual({ status: 'not_found' });
  });

  it('treats 400 as not_found', () => {
    expect(interpretErrorStatus(400, new Headers())).toStrictEqual({ status: 'not_found' });
  });

  it('treats 503 with a valid Retry-After as unavailable, preserving the seconds', () => {
    const headers = new Headers({ 'Retry-After': '5' });
    expect(interpretErrorStatus(503, headers)).toStrictEqual({ status: 'unavailable', retryAfterSeconds: 5 });
  });

  it('treats 503 with no Retry-After header as unavailable with a null retry hint', () => {
    expect(interpretErrorStatus(503, new Headers())).toStrictEqual({ status: 'unavailable', retryAfterSeconds: null });
  });

  it('treats 503 with an unparseable Retry-After as unavailable with a null retry hint', () => {
    const headers = new Headers({ 'Retry-After': 'not-a-number' });
    expect(interpretErrorStatus(503, headers)).toStrictEqual({ status: 'unavailable', retryAfterSeconds: null });
  });

  it("treats a generic 500 (e.g. service-api's catch-all error handler) as unavailable, not not_found", () => {
    expect(interpretErrorStatus(500, new Headers())).toStrictEqual({ status: 'unavailable', retryAfterSeconds: null });
  });

  it('treats other 5xx statuses as unavailable too', () => {
    expect(interpretErrorStatus(502, new Headers())).toStrictEqual({ status: 'unavailable', retryAfterSeconds: null });
  });
});
