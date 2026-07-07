/**
 * Normalize guild name for consistent caching and comparison
 */
export function normalizeGuildName(name: string): string {
  return (
    name
      .toLowerCase() // ASCII-safe, fast
      .trim()
      .replaceAll('-', ' ') // Normalize spaces
      .replaceAll(/\s+/gu, ' ') // Normalize spaces
      // Optional: Handle special characters consistently
      .normalize('NFD') // Decompose accented characters
      .replaceAll(/[\u0300-\u036F]/gu, '') // Remove diacritical marks
      .slice(0, 100)
  ); // Prevent extremely long cache keys
}
