import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import { WVW_TEAMS, type WvWTeam } from '@repo/service-api/src/definitions';
import Link from 'next/link';

const naTeams: WvWTeam[] = Object.values(WVW_TEAMS)
  .filter(({ id }) => id.startsWith('11'))
  .sort((a, b) => a.en.localeCompare(b.en));
const euTeams: WvWTeam[] = Object.values(WVW_TEAMS)
  .filter(({ id }) => id.startsWith('12'))
  .sort((a, b) => a.en.localeCompare(b.en));

const langs = ['en', 'de', 'es', 'fr'] as const;

export default function WvwTeamsPage() {
  return (
    <SiteLayout pageHeader={'WvW Teams'}>
      <header>
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">North American Teams</h2>
      </header>
      <ul>
        {naTeams.map((wvwTeam) => (
          <li key={wvwTeam.id} className="my-4">
            <div className="grid grid-cols-4 gap-4">
              {langs.map((lang) => (
                <Link key={lang} href={`/wvw/teams/${wvwTeam[lang]}?lang=${lang}`}>
                  {wvwTeam[lang]}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <header>
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">European Teams</h2>
      </header>
      <ul>
        {euTeams.map((wvwTeam) => (
          <li key={wvwTeam.id} className="my-4">
            <div className="grid grid-cols-4 gap-4">
              {langs.map((lang) => (
                <Link key={lang} href={`/wvw/teams/${wvwTeam[lang]}?lang=${lang}`}>
                  {wvwTeam[lang]}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </SiteLayout>
  );
}
