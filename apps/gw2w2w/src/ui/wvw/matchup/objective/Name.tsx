import { useWvwObjective } from '@gw2w2w/lib/wvw/objectives';
import { cn } from '@gw2w2w/lib/utils/cn';

export function ObjectiveName({ objectiveId, className }: { objectiveId: string; className?: string }) {
  const { data: objectiveLabels } = useWvwObjective(objectiveId);

  return (
    <span className={cn('overflow-hidden text-xs text-nowrap text-ellipsis', className)}>{objectiveLabels?.name}</span>
  );
}
