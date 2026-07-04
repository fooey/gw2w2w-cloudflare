'use client';

import { EMBLEM_SIZES, isEmblemSize } from '@repo/emblem-renderer/sizes';
import { emblemBackgroundClasses } from '#lib/definitions/emblem-backgrounds';
import { getEmblemSrc } from '#lib/emblems';
import { useUserPrefs } from '#lib/store/userPrefs';
import { Card } from '#ui/Card';
import { Link } from '#ui/Link';
import { clsx } from 'clsx';

interface GuildEmblemGridProps {
  guildId: string;
  title?: React.ReactNode;
  linkHref?: string;
}

export function GuildEmblemGrid({ guildId, title = 'Example Guild Emblems', linkHref }: GuildEmblemGridProps) {
  const size = useUserPrefs((s) => s.emblemSize);
  const setEmblemSize = useUserPrefs((s) => s.setEmblemSize);

  const sizeSelector = (
    <select
      value={size}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (isEmblemSize(n)) setEmblemSize(n);
      }}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600"
    >
      {EMBLEM_SIZES.map((s) => (
        <option key={s} value={s}>
          {s}px
        </option>
      ))}
    </select>
  );

  return (
    <Card title={title} rightContent={sizeSelector}>
      <ul className="flex flex-wrap gap-3">
        {emblemBackgroundClasses.map((backgroundClass) => (
          <li key={backgroundClass}>
            <Link
              href={linkHref ?? getEmblemSrc(guildId, size)}
              className={clsx(backgroundClass, 'inline-flex rounded-xl p-4')}
            >
              <img
                loading="lazy"
                src={getEmblemSrc(guildId, size)}
                alt="Guild Emblem"
                width={size}
                height={size}
                className="shrink-0"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
