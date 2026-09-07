/**
 * React Router matches routes against an already-decoded pathname, so a route param reaches a
 * loader or component decoded — with one exception: a literal `/` inside a segment is re-encoded
 * as `%2F` so it cannot be mistaken for a path boundary. This undoes exactly that, and nothing
 * else.
 *
 * Running `decodeURIComponent` on a param instead is a bug in both directions. It throws on a name
 * holding a literal `%` — a guild called "100% Pure" arrives as `100% Pure` — which surfaced as a
 * false "no such guild" 404. And it silently mangles a name holding a literal `%20`, turning
 * "50%20off" into "50 off" and looking up the wrong guild.
 */
export function decodeRouteParam(value: string): string {
  return value.replaceAll(/%2f/giu, '/');
}
