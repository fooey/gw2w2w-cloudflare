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
