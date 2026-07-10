/**
 * True when value is null or undefined.
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * True when value is neither null nor undefined.
 */
export function isPresent<T>(value: T): value is Exclude<T, null | undefined> {
  return !isNil(value);
}

/**
 * True when value is null, undefined, or an empty string.
 */
export function isEmpty(value: string | null | undefined): value is null | undefined | '' {
  return isNil(value) || value === '';
}

/**
 * True when value is neither null, undefined, nor an empty string.
 */
export function isNonEmptyString(value: string | null | undefined): value is string {
  return !isEmpty(value);
}

/**
 * True when value is null, undefined, or an empty array.
 *
 * Plain boolean, not a type predicate — the true branch also covers `[]`, which
 * is neither null nor undefined, so `value is null | undefined` would be unsound.
 */
export function isEmptyArray(value: readonly unknown[] | null | undefined): boolean {
  return isNil(value) || value.length === 0;
}

/**
 * True when value is neither null, undefined, nor an empty array.
 *
 * Shaped as `T[] | null | undefined` (not `isPresent`'s free `T`) so it narrows
 * correctly against complex discriminated-union types like react-query's `data`.
 */
export function isNonEmptyArray<T>(value: readonly T[] | null | undefined): value is readonly T[] {
  return !isEmptyArray(value);
}
