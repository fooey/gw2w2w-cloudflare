import { fetchWvwObjectives } from '@gw2w2w/lib/api/gw2/wvw/objectives';
import { type WvWObjective } from '@service-api/lib/resources/wvw/objectives';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export async function getWvWObjectIcons() {
  const objectives = await fetchWvwObjectives();
  if (!objectives) return null;

  const iconMap = new Map<WvWObjective['type'], string | undefined>();
  for (const { type, marker } of objectives) {
    if (!iconMap.has(type)) {
      iconMap.set(type, marker);
    }
  }

  return Array.from(iconMap.entries()).map(([type, marker]) => ({ type, marker }));
}

export function useWvwObjectives(queryOptions?: Partial<UseQueryOptions<WvWObjective[] | null>>) {
  return useQuery({
    queryKey: ['wvwObjectives'],
    queryFn: () => fetchWvwObjectives(),
    ...queryOptions,
  });
}
export function useWvwObjective(objectiveId: string, queryOptions?: Partial<UseQueryOptions<WvWObjective | null>>) {
  const objectivesQuery = useWvwObjectives(queryOptions as Partial<UseQueryOptions<WvWObjective[] | null>>);
  const objectivesDictionary = objectivesQuery.data?.reduce(
    (dict, obj) => {
      dict[obj.id] = obj;
      return dict;
    },
    {} as Record<string, WvWObjective>,
  );

  return {
    ...objectivesQuery,
    data: objectiveId && objectivesDictionary ? objectivesDictionary[objectiveId] : null,
  };
}

export function useWvWObjectIcon(type: WvWObjective['type']) {
  return useQuery({
    queryKey: ['wvwObjectives'],
    queryFn: () => fetchWvwObjectives(),
    select: (data) => data?.find((obj) => obj.type === type)?.marker,
  });
}
