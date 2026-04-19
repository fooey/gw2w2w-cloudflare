import { useWvwObjective } from '#lib/wvw/objectives';
import { cn } from '#lib/utils/cn';

export function Name({ objectiveId, className }: { objectiveId: string; className?: string }) {
  const { data: objectiveLabels } = useWvwObjective(objectiveId);

  return (
    <span className={cn('overflow-hidden text-xs text-nowrap text-ellipsis', className)}>{objectiveLabels?.name}</span>
  );
}
