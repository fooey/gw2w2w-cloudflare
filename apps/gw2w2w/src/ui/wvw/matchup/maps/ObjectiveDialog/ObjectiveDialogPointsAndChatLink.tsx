import type { WvWObjective } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';
import { ClipboardIcon } from '@heroicons/react/20/solid';

interface ObjectiveDialogPointsAndChatLinkProps {
  objectiveDef: WvWObjective | null | undefined;
  pointsTick: number;
  pointsCapture: number;
  onCopyChatLink: () => void;
}

export function ObjectiveDialogPointsAndChatLink({
  objectiveDef,
  pointsTick,
  pointsCapture,
  onCopyChatLink,
}: ObjectiveDialogPointsAndChatLinkProps) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-3">
      <div className="flex gap-4 text-xs text-gray-400">
        <span>{pointsTick} pts/tick</span>
        <span>{pointsCapture} pts/capture</span>
      </div>
      {isPresent(objectiveDef?.chat_link) && (
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500 hover:bg-gray-200"
          title="Copy chat link"
          onClick={onCopyChatLink}
        >
          <ClipboardIcon className="size-3" />
          {objectiveDef.chat_link}
        </button>
      )}
    </div>
  );
}
