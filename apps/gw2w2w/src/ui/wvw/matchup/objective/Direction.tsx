import { type Direction } from '@gw2w2w/ui/wvw/config/objectivesLayoutConfig';
import {
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpLeftIcon,
  ArrowUpRightIcon,
  StarIcon,
} from '@heroicons/react/20/solid';

const DirectionIcons: Record<Direction, typeof StarIcon> = {
  C: StarIcon,
  N: ArrowUpIcon,
  NE: ArrowUpRightIcon,
  E: ArrowRightIcon,
  SE: ArrowDownRightIcon,
  S: ArrowDownIcon,
  SW: ArrowDownLeftIcon,
  W: ArrowLeftIcon,
  NW: ArrowUpLeftIcon,
};

export function ObjectiveDirection({ direction, ...rest }: { direction: Direction } & React.ComponentProps<'svg'>) {
  const Icon = DirectionIcons[direction];
  return <Icon {...rest} />;
}
