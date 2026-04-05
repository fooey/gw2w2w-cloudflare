export const teamColorConfig = {
  Neutral: { bg: 'bg-gray-50', text: 'text-gray-900', icon: 'text-gray-400', border: 'border-gray-300' },
  Green: { bg: 'bg-green-50', text: 'text-green-900', icon: 'text-green-400', border: 'border-green-500' },
  Blue: { bg: 'bg-blue-50', text: 'text-blue-900', icon: 'text-blue-400', border: 'border-blue-500' },
  Red: { bg: 'bg-red-50', text: 'text-red-900', icon: 'text-red-400', border: 'border-red-500' },
} as const;

export type TeamColorConfigKey = keyof typeof teamColorConfig;

export const TEAM_COLORS = ['Green', 'Blue', 'Red'] as const;
export const MAP_TYPES = ['Center', 'GreenHome', 'BlueHome', 'RedHome'] as const;
