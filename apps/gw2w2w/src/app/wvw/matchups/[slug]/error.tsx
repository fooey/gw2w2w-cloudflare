'use client';

import SiteLayout from '#ui/layout/SiteLayout';
import Link from '#ui/Link';

export default function MatchupError() {
  return (
    <SiteLayout pageHeader={'WvW Matchup'}>
      <div className="space-y-4">
        <p className="text-gray-700">
          This matchup could not be loaded. The Guild Wars 2 API may be temporarily unavailable — this often happens
          during game patches or maintenance.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="cursor-pointer rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try again
          </button>
          <Link
            href="/wvw/matchups"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to matchups
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}
