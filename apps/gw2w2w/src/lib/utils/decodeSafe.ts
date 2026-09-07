/**
 * `decodeURIComponent` throws a `URIError` on malformed percent-encoding (`/guilds/%E0%A4%A`, say),
 * and URL paths are attacker-controlled — an unguarded call on a route parameter is a 500 on a
 * public URL. Every caller here is either displaying a slug or looking one up, and the raw text is
 * a fine fallback for both: it renders as typed, and it matches nothing in a lookup table, which is
 * the correct answer for input that was never a valid encoding.
 */
export function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
