/**
 * Returns true if the string looks like a UUID (8-4-4-4-12 hex, any version).
 * GW2 guild IDs use non-standard version nibbles (E, F) so stricter checks would reject valid IDs.
 */
export function validateArenaNetUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}
