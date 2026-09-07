import { useEffect } from 'react';
import { data, href, isRouteErrorResponse, useRevalidator } from 'react-router';

import { WVW_TEAMS } from '@repo/service-api/definitions';
import { isNil, isPresent } from '@repo/utils';

import type { WvwMatchLookupResult } from '#lib/api/wvw/matches';
import { getApi } from '#lib/api/api.server.ts';
import { fetchWvwMatch, fetchWvwMatchByTeam } from '#lib/api/wvw/matches';
import { cloudflareContext } from '#lib/cloudflare-context.ts';
import { resolveSlug } from '#lib/wvw/matchup';
import { SiteLayout } from '#ui/layout/SiteLayout';
import { Link } from '#ui/Link';
import { MatchupView } from '#ui/wvw/matchup/MatchupView';

import type { Route } from './+types/matchup-detail';

export async function loader({ params, context }: Route.LoaderArgs) {
  const { slug } = params;
  const { matchId, selectedTeamId } = resolveSlug(slug);

  const api = getApi(context.get(cloudflareContext).env);
  let result: WvwMatchLookupResult;
  if (isPresent(matchId)) {
    result = await fetchWvwMatch(api, matchId);
  } else if (isPresent(selectedTeamId)) {
    result = await fetchWvwMatchByTeam(api, selectedTeamId);
  } else {
    result = { status: 'not_found' };
  }

  if (result.status !== 'ok') {
    // Slug didn't resolve to a known team or match ID format — genuine 404.
    if (isNil(matchId) && isNil(selectedTeamId)) {
      // eslint-disable-next-line typescript/only-throw-error -- throwing a Response is how a loader signals an HTTP status in React Router; it routes to the nearest ErrorBoundary.
      throw new Response('Not Found', { status: 404 });
    }

    // The `in` check below already guards against an unknown team id; tsgo just doesn't narrow it.
    const teamName =
      isPresent(selectedTeamId) && selectedTeamId in WVW_TEAMS
        ? // eslint-disable-next-line typescript/no-unsafe-type-assertion
          WVW_TEAMS[selectedTeamId as keyof typeof WVW_TEAMS].en
        : null;
    const subject = teamName ? `${teamName}'s matchup` : `Matchup ${matchId ?? slug}`;
    // Poller-outage case retries fast (matching the API's own Retry-After); the "no active match
    // right now" case (weekly reset gap) retries slower since it's expected to resolve on its own.
    const refreshSeconds = result.status === 'unavailable' ? (result.retryAfterSeconds ?? 5) : 30;

    // Same split as guild-detail: 'not_found' is a real 404 (no such matchup right now),
    // 'unavailable' is a 503 (the poller is behind — ask again). Neither is a 200: the retry UI
    // below still renders either way, since `data()` sets the status without throwing.
    return data(
      { ok: false as const, slug, subject, refreshSeconds, status: result.status },
      { status: result.status === 'unavailable' ? 503 : 404 },
    );
  }

  return { ok: true as const, match: result.match, selectedTeamId };
}

interface MatchupUnavailableProps {
  subject: string;
  refreshSeconds: number;
  status: 'unavailable' | 'not_found';
}

/**
 * Polls for the match becoming available by revalidating the loader, not by reloading the document
 * — a full reload would reboot the JS bundle and discard app state every few seconds.
 */
function MatchupUnavailable({ subject, refreshSeconds, status }: MatchupUnavailableProps) {
  const { revalidate, state } = useRevalidator();

  useEffect(() => {
    const timer = setInterval(() => {
      void revalidate();
    }, refreshSeconds * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [refreshSeconds, revalidate]);

  const isRetrying = state !== 'idle';

  return (
    <SiteLayout pageHeader="WvW Matchup">
      <div className="space-y-4">
        <p className="text-gray-700">
          {status === 'unavailable' ? (
            <>
              {subject} data is temporarily unavailable — the match poller is catching up. This page will retry
              automatically.
            </>
          ) : (
            <>
              {subject} is not currently active. This typically happens briefly during the weekly reset — check back in
              a few minutes.
            </>
          )}
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              void revalidate();
            }}
            disabled={isRetrying}
            className="cursor-pointer rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-default disabled:opacity-60"
          >
            {isRetrying ? 'Checking…' : 'Try again'}
          </button>
          <Link
            href={href('/wvw/matchups')}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View all matchups
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}

export default function WvwMatchupPage({ loaderData }: Route.ComponentProps) {
  if (!loaderData.ok) {
    const { subject, refreshSeconds, status } = loaderData;
    return <MatchupUnavailable subject={subject} refreshSeconds={refreshSeconds} status={status} />;
  }

  return <MatchupView match={loaderData.match} selectedTeamId={loaderData.selectedTeamId} />;
}

/**
 * Route-scoped so a matchup failure keeps the surrounding page shell — without it, errors here
 * bubble to root's boundary and replace the entire document.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <SiteLayout pageHeader="WvW Matchup">
      <div className="space-y-4">
        <p className="text-gray-700">
          {isNotFound
            ? 'That matchup does not exist. It may have been from a previous week, or the link may be mistyped.'
            : 'This matchup could not be loaded. The Guild Wars 2 API may be temporarily unavailable — this often happens during game patches or maintenance.'}
        </p>
        <div className="flex gap-4">
          <Link
            href={href('/wvw/matchups')}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            View all matchups
          </Link>
          <Link
            href={href('/')}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Return home
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}
