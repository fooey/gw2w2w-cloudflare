// This file exercises null/undefined-handling logic directly, so explicit `undefined`
// arguments are the point of the test, not redundant noise.
/* eslint-disable unicorn/no-useless-undefined */
import { describe, expect, expectTypeOf, it } from 'vitest';

import { isEmpty, isEmptyArray, isNil, isNonEmptyArray, isNonEmptyString, isPresent } from './nullish';

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

describe('isEmptyArray', () => {
  it('returns true for null, undefined, and an empty array', () => {
    expect(isEmptyArray(null)).toBe(true);
    expect(isEmptyArray(undefined)).toBe(true);
    expect(isEmptyArray([])).toBe(true);
  });
  it('returns false for a non-empty array', () => {
    expect(isEmptyArray([1])).toBe(false);
  });
});

describe('isNonEmptyArray', () => {
  it('returns false for null, undefined, and an empty array', () => {
    expect(isNonEmptyArray(null)).toBe(false);
    expect(isNonEmptyArray(undefined)).toBe(false);
    expect(isNonEmptyArray([])).toBe(false);
  });
  it('returns true for a non-empty array', () => {
    expect(isNonEmptyArray([1])).toBe(true);
  });

  // Regression test: isPresent's free generic `<T>(value: T)` fails to narrow
  // through complex discriminated unions like @tanstack/react-query's `data`
  // field (found in ObjectiveDialog.tsx). isNonEmptyArray is shaped as
  // `T[] | null | undefined` instead, which narrows correctly through the same
  // kind of union — locked in via expectTypeOf, checked by `tsc` during
  // `pnpm check-types`, not by the runtime assertion alone.
  interface Item {
    id: number;
  }

  type QueryResult<TData> =
    | { status: 'pending'; data: undefined }
    | { status: 'error'; data: undefined }
    | { status: 'success'; data: TData };

  it('narrows react-query-shaped data to a non-empty array', () => {
    const result: QueryResult<Item[] | null> = { status: 'success', data: [{ id: 1 }] };

    expect(isNonEmptyArray(result.data)).toBe(true);

    // The `if` above already proves this branch always runs — it's a narrowing
    // gate for the type-only check below, not a real conditional test path.
    // eslint-disable-next-line vitest/no-conditional-in-test
    if (isNonEmptyArray(result.data)) {
      expectTypeOf(result.data).toEqualTypeOf<Item[]>();
    }
  });
});
