const MAP_LABELS: Record<string, string> = {
  Center: 'EBG',
  GreenHome: 'GBL',
  BlueHome: 'BBL',
  RedHome: 'RBL',
};

export function getMapLabel(mapType: string): string {
  return MAP_LABELS[mapType] ?? mapType;
}
