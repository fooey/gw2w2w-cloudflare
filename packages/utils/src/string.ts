/**
 * Normalize guild name for consistent caching and comparison
 */
export function normalizeGuildName(name: string): string {
  return (
    name
      .toLowerCase() // ASCII-safe, fast
      .trim()
      .replaceAll('-', ' ') // Normalize spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      // Optional: Handle special characters consistently
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .substring(0, 100)
  ); // Prevent extremely long cache keys
}
