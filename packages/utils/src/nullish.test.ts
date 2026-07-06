// This file exercises null/undefined-handling logic directly, so explicit `undefined`
// arguments are the point of the test, not redundant noise.
/* eslint-disable unicorn/no-useless-undefined */
import { describe, expect, it } from 'vitest';

import { isEmpty, isNil, isNonEmptyString, isPresent } from './nullish';

describe('isNil', () => {
  it('returns true for null and undefined', () => {
    expect(isNil(null)).toBe(true);
    expect(isNil(undefined)).toBe(true);
  });
  it('returns false for present values, including falsy ones', () => {
    expect(isNil(0)).toBe(false);
    expect(isNil('')).toBe(false);
    expect(isNil(false)).toBe(false);
    expect(isNil(Number.NaN)).toBe(false);
  });
});

describe('isPresent', () => {
  it('returns false for null and undefined', () => {
    expect(isPresent(null)).toBe(false);
    expect(isPresent(undefined)).toBe(false);
  });
  it('returns true for present values, including falsy ones', () => {
    expect(isPresent(0)).toBe(true);
    expect(isPresent('')).toBe(true);
    expect(isPresent(false)).toBe(true);
  });
});

describe('isEmpty', () => {
  it('returns true for null, undefined, and empty string', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
  });
  it('returns false for a non-empty string', () => {
    expect(isEmpty('a')).toBe(false);
    expect(isEmpty(' ')).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('returns false for null, undefined, and empty string', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString('')).toBe(false);
  });
  it('returns true for a non-empty string', () => {
    expect(isNonEmptyString('a')).toBe(true);
    expect(isNonEmptyString(' ')).toBe(true);
  });
});
