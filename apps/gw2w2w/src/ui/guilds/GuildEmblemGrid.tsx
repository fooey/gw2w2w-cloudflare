import { emblemBackgroundClasses } from '#lib/definitions/emblem-backgrounds';
import { getEmblemSrc } from '#lib/emblems';
import { Card } from '#ui/Card';
import Link from '#ui/Link';
import { clsx } from 'clsx';

interface GuildEmblemGridProps {
  guildId: string;
}

export function GuildEmblemGrid({ guildId }: GuildEmblemGridProps) {
  return (
    <Card title="Example Guild Emblems">
      <ul className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {emblemBackgroundClasses.map((backgroundClass) => (
          <li key={backgroundClass}>
            <Link href={getEmblemSrc(guildId)} className={clsx(backgroundClass, 'inline-flex rounded-xl p-4')}>
              <img loading="lazy" src={getEmblemSrc(guildId)} alt="Guild Emblem" width={128} height={128} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
