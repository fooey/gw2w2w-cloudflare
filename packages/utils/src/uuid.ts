/**
 * Validates ArenaNet's custom UUID format (GW2 guild IDs)
 * These UUIDs don't follow standard UUID version rules
 */
export function validateArenaNetUuid(uuid: string): boolean {
  // Basic UUID format: 8-4-4-4-12 hex characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
