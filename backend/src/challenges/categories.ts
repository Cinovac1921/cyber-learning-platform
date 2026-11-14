export const CATEGORIES = [
  'NETWORK_ANALYSIS',
  'FORENSICS',
  'WEB',
  'REVERSE_ENGINEERING',
  'CRYPTOGRAPHY',
] as const;

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export type ChallengeCategoryName = (typeof CATEGORIES)[number];
export type ChallengeDifficultyName = (typeof DIFFICULTIES)[number];
