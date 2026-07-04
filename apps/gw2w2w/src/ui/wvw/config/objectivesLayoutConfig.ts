import type { WvWMapType } from '@repo/service-api/types';

export type ObjectivesLayout = Record<WvWMapType, ObjectivesLayoutMap>;
export type ObjectivesLayoutMap = Record<string, { objectives: LayoutObjective[] }>;
export interface LayoutObjective {
  id: string;
  direction: Direction;
}
export type Direction = 'C' | 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';

const DIRECTION_LABELS: Record<Direction, string> = {
  C: 'Center',
  N: 'North',
  S: 'South',
  E: 'East',
  W: 'West',
  NE: 'North East',
  NW: 'North West',
  SE: 'South East',
  SW: 'South West',
};

export function getDirectionLabel(direction: Direction): string {
  return DIRECTION_LABELS[direction];
}

const objectivesLayoutEB: ObjectivesLayoutMap = {
  'Castle': {
    objectives: [
      { id: '9', direction: 'C' }, //sm
    ],
  },
  'Red Corner': {
    objectives: [
      { id: '1', direction: 'C' }, //sm
      { id: '17', direction: 'NW' }, //mendons
      { id: '20', direction: 'NE' }, //veloka
      { id: '19', direction: 'SW' }, //ogre
      { id: '18', direction: 'SE' }, //anz
      { id: '5', direction: 'E' }, //pang
      { id: '6', direction: 'W' }, //speldan
    ],
  },
  'Blue Corner': {
    objectives: [
      { id: '2', direction: 'C' }, //valley
      { id: '22', direction: 'SW' }, //bravost
      { id: '15', direction: 'SE' }, //langor
      { id: '16', direction: 'NW' }, //quentin
      { id: '21', direction: 'NE' }, //durios
      { id: '7', direction: 'W' }, //dane
      { id: '8', direction: 'E' }, //umber
    ],
  },
  'Green Corner': {
    objectives: [
      { id: '3', direction: 'C' }, //lowlands
      { id: '11', direction: 'SW' }, //aldons
      { id: '13', direction: 'SE' }, //jerrifer
      { id: '12', direction: 'NW' }, //wildcreek
      { id: '14', direction: 'NE' }, //klovan
      { id: '10', direction: 'W' }, //rogues
      { id: '4', direction: 'E' }, //golanta
    ],
  },
} as const;

const objectivesLayoutAlpineBL: ObjectivesLayoutMap = {
  HomeGarri: {
    objectives: [
      { id: '37', direction: 'C' }, //keep
    ],
  },
  HomeTowers: {
    objectives: [
      { id: '38', direction: 'NW' }, //longview
      { id: '40', direction: 'NE' }, //cliffside
    ],
  },
  HomeCamps: {
    objectives: [
      { id: '39', direction: 'N' }, //godsword
      { id: '52', direction: 'NW' }, //hopes
      { id: '51', direction: 'NE' }, //astral
    ],
  },
  InvaderTeam1: {
    objectives: [
      { id: '33', direction: 'W' }, //bay
      { id: '35', direction: 'SW' }, //briar
      { id: '53', direction: 'SW' }, //vale
    ],
  },
  InvaderTeam2: {
    objectives: [
      { id: '32', direction: 'E' }, //hills,
      { id: '36', direction: 'SE' }, //lake
      { id: '50', direction: 'SE' }, //water
    ],
  },
  Neutral: {
    objectives: [
      { id: '34', direction: 'S' }, //lodge
    ],
  },
  // Ruins: {
  //   objectives: [
  //     { id: '62', direction: '' }, //temple
  //     { id: '63', direction: '' }, //hollow
  //     { id: '64', direction: '' }, //estate
  //     { id: '65', direction: '' }, //orchard
  //     { id: '66', direction: '' }, //ascent
  //   ],
  // },
} as const;

const objectivesLayoutDesertBL: ObjectivesLayoutMap = {
  HomeGarri: {
    objectives: [
      { id: '113', direction: 'C' }, //keep
    ],
  },
  HomeTowers: {
    objectives: [
      { id: '102', direction: 'NW' }, //odel
      { id: '104', direction: 'NE' }, //necro
    ],
  },
  HomeCamps: {
    objectives: [
      { id: '99', direction: 'N' }, //lab
      { id: '115', direction: 'NW' }, //hideaway
      { id: '109', direction: 'NE' }, //refuge
    ],
  },
  InvaderTeam1: {
    objectives: [
      { id: '106', direction: 'W' }, //fire
      { id: '110', direction: 'SW' }, //outpost
      { id: '101', direction: 'SW' }, //encampment
    ],
  },
  InvaderTeam2: {
    objectives: [
      { id: '114', direction: 'E' }, //air
      { id: '105', direction: 'SE' }, //depot
      { id: '100', direction: 'SE' }, //farmstead
    ],
  },
  Neutral: {
    objectives: [
      { id: '116', direction: 'S' }, //well
    ],
  },
  // Ruins: {
  //   objectives: [
  //     { id: '62', direction: '' }, //temple
  //     { id: '63', direction: '' }, //hollow
  //     { id: '64', direction: '' }, //estate
  //     { id: '65', direction: '' }, //orchard
  //     { id: '66', direction: '' }, //ascent
  //   ],
  // },
} as const;

export const objectivesLayout: ObjectivesLayout = {
  Center: objectivesLayoutEB,
  GreenHome: objectivesLayoutAlpineBL,
  BlueHome: objectivesLayoutAlpineBL,
  RedHome: objectivesLayoutDesertBL,
};

export const objectiveDirections: ReadonlyMap<string, Direction> = new Map(
  Object.values(objectivesLayout).flatMap((mapLayout) =>
    Object.values(mapLayout).flatMap((section) => section.objectives.map((obj) => [obj.id, obj.direction] as const)),
  ),
);

/** @param objectiveId full match objective id, e.g. `"38-9"` */
export function getObjectiveDirection(objectiveId: string): Direction | undefined {
  const shortId = objectiveId.split('-')[1] ?? objectiveId;
  return objectiveDirections.get(shortId);
}
