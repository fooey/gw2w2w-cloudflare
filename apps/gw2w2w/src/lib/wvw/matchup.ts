import { WVW_TEAMS } from '@repo/service-api/definitions';
import type { WvWMatch } from '@repo/service-api/types';
import { isNil } from '@repo/utils';

/** e.g. "1-1", "2-3" */
export function isMatchId(slug: string): boolean {
  return /^\d+-\d+$/u.test(slug);
}

/** e.g. "11001" */
export function isTeamId(slug: string): boolean {
  return /^\d{5}$/u.test(slug);
}

/** Resolve a teamId or team name (any lang) to a canonical teamId, or null if not found. */
export function resolveTeamId(slug: string): string | null {
  if (isTeamId(slug)) return slug;
  const decoded = decodeURIComponent(slug).toLowerCase();
  const team = Object.values(WVW_TEAMS).find(
    (t) =>
      t.en.toLowerCase() === decoded ||
      t.de.toLowerCase() === decoded ||
      t.es.toLowerCase() === decoded ||
      t.fr.toLowerCase() === decoded,
  );
  return team?.id ?? null;
}

/** Find the current match containing the given teamId (numeric string). */
export function findMatchForTeam(matches: WvWMatch[], teamId: string): WvWMatch | null {
  // parseInt tolerates trailing garbage and doesn't auto-detect a leading "0x" as hex, unlike Number().
  // eslint-disable-next-line unicorn/prefer-number-coercion
  const id = Number.parseInt(teamId, 10);
  return (
    matches.find(
      (m) => m.all_worlds.red.includes(id) || m.all_worlds.blue.includes(id) || m.all_worlds.green.includes(id),
    ) ?? null
  );
}

export interface ResolvedSlug {
  matchId: string | null;
  selectedTeamId: string | null;
}

/** Synchronously resolve a slug to its matchId (if known) and selectedTeamId. */
export function resolveSlug(slug: string): ResolvedSlug {
  if (isMatchId(slug)) return { matchId: slug, selectedTeamId: null };
  const teamId = resolveTeamId(slug);
  return { matchId: null, selectedTeamId: teamId };
}

export interface ResolvedMatchup {
  match: WvWMatch | null;
  selectedTeamId: string | null;
}

/**
 * Given a URL slug (matchId, teamId, or teamName in any lang) and the full
 * list of current matches, resolve the match and optional selected team.
 */
export function resolveMatchup(slug: string, matches: WvWMatch[]): ResolvedMatchup {
  if (isMatchId(slug)) {
    const match = matches.find((m) => m.id === slug) ?? null;
    return { match, selectedTeamId: null };
  }

  const teamId = resolveTeamId(slug);
  if (isNil(teamId)) return { match: null, selectedTeamId: null };

  const match = findMatchForTeam(matches, teamId);
  return { match, selectedTeamId: teamId };
}
