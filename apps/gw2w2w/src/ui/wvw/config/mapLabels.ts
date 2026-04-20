const MAP_LABELS: Record<string, string> = {
  Center: 'EBG',
  GreenHome: 'GBL',
  BlueHome: 'BBL',
  RedHome: 'RBL',
};

const MAP_LABELS_FULL: Record<string, string> = {
  Center: 'Eternal Battlegrounds',
  GreenHome: 'Green Borderlands',
  BlueHome: 'Blue Borderlands',
  RedHome: 'Red Borderlands',
};

export function getMapLabel(mapType: string): string {
  return MAP_LABELS[mapType] ?? mapType;
}

export function getMapLabelFull(mapType: string): string {
  return MAP_LABELS_FULL[mapType] ?? mapType;
}
