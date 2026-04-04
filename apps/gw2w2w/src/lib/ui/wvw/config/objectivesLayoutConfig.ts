export type ObjectivesLayout = Record<string, ObjectivesLayoutMap>;
export type ObjectivesLayoutMap = Record<string, { objectives: LayoutObjective[] }>;
export interface LayoutObjective { id: string; direction: Direction }
export type Direction = 'C' | 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';

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
      { id: '13', direction: 'SE' }, //jerrifer
      { id: '11', direction: 'SW' }, //aldons
      { id: '14', direction: 'NE' }, //klovan
      { id: '12', direction: 'NW' }, //wildcreek
      { id: '10', direction: 'W' }, //rogues
      { id: '4', direction: 'E' }, //golanta
    ],
  },
} as const;

const objectivesLayoutAlpineBL: ObjectivesLayoutMap = {
  North: {
    objectives: [
      { id: '37', direction: 'C' }, //keep
      { id: '33', direction: 'W' }, //bay
      { id: '32', direction: 'E' }, //hills
      { id: '38', direction: 'NW' }, //longview
      { id: '40', direction: 'NE' }, //cliffside
      { id: '39', direction: 'N' }, //godsword
      { id: '52', direction: 'NW' }, //hopes
      { id: '51', direction: 'NE' }, //astral
    ],
  },
  South: {
    objectives: [
      { id: '35', direction: 'SW' }, //briar
      { id: '36', direction: 'SE' }, //lake
      { id: '34', direction: 'SW' }, //lodge
      { id: '53', direction: 'SE' }, //vale
      { id: '50', direction: 'S' }, //water
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
  North: {
    objectives: [
      { id: '113', direction: 'C' }, //keep
      { id: '106', direction: 'W' }, //bay
      { id: '114', direction: 'E' }, //hills
      { id: '102', direction: 'NW' }, //longview
      { id: '104', direction: 'NE' }, //cliffside
      { id: '99', direction: 'N' }, //godsword
      { id: '115', direction: 'NW' }, //hopes
      { id: '109', direction: 'NE' }, //astral
    ],
  },
  South: {
    objectives: [
      { id: '110', direction: 'SW' }, //briar
      { id: '105', direction: 'SE' }, //lake
      { id: '101', direction: 'SW' }, //lodge
      { id: '100', direction: 'SE' }, //vale
      { id: '116', direction: 'S' }, //water
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
