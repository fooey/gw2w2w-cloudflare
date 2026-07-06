import { PencilSquareIcon } from '@heroicons/react/24/outline';

import type { Guild } from '@repo/service-api/types';

import { getDesignerSrc } from '#lib/emblems';
import { Card } from '#ui/Card';
import { Link } from '#ui/Link';

interface GuildOpenInDesignerProps {
  emblem: NonNullable<Guild['emblem']>;
}

export function GuildOpenInDesigner({ emblem }: GuildOpenInDesignerProps) {
  return (
    <Card title="Open in Emblem Designer">
      <p className="mb-4 text-sm text-gray-600">
        Load this guild&apos;s emblem into the designer to customize colors, flip layers, or use it as a starting point
        for your own design.
      </p>
      <Link
        href={getDesignerSrc(emblem)}
        className="inline-flex items-center gap-3 rounded-lg bg-rose-900 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:outline-none"
      >
        <PencilSquareIcon className="size-5" />
        Open in Designer
      </Link>
    </Card>
  );
}
