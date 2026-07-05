import { isPresent } from '@repo/utils';
import { formatLocalized, formatRelative } from './utils';

interface ObjectiveDialogCaptureClaimTimesProps {
  lastFlipped: string | null | undefined;
  claimedAt: string | null | undefined;
  now: Temporal.Instant | null;
}

export function ObjectiveDialogCaptureClaimTimes({
  lastFlipped,
  claimedAt,
  now,
}: ObjectiveDialogCaptureClaimTimesProps) {
  return (
    <div className="mb-4 flex flex-col gap-1 text-sm">
      {isPresent(lastFlipped) && (
        <div className="flex justify-between">
          <span className="text-gray-400">Captured</span>
          <span className="text-gray-600">
            {now && (
              <>
                {formatRelative(lastFlipped, now)}
                {' · '}
              </>
            )}
            {formatLocalized(lastFlipped)}
          </span>
        </div>
      )}
      {isPresent(claimedAt) && (
        <div className="flex justify-between">
          <span className="text-gray-400">Claimed</span>
          <span className="text-gray-600">
            {now && (
              <>
                {formatRelative(claimedAt, now)}
                {' · '}
              </>
            )}
            {formatLocalized(claimedAt)}
          </span>
        </div>
      )}
    </div>
  );
}
