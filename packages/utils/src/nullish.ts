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
