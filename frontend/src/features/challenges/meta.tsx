import type { ReactNode } from 'react'
import { ChartIcon, DatabaseIcon, GlobeIcon, ShieldIcon, WrenchIcon } from '../../components/Icons'
import type { ChallengeCategory, ChallengeDifficulty } from '../../types/challenges'

export const CATEGORIES: { value: ChallengeCategory; label: string; icon: ReactNode }[] = [
  { value: 'WEB', label: 'Web', icon: <GlobeIcon size={22} /> },
  { value: 'NETWORK_ANALYSIS', label: 'Network Analysis', icon: <ChartIcon size={22} /> },
  { value: 'FORENSICS', label: 'Forensics', icon: <DatabaseIcon size={22} /> },
  { value: 'REVERSE_ENGINEERING', label: 'Reverse Engineering', icon: <WrenchIcon size={22} /> },
  { value: 'CRYPTOGRAPHY', label: 'Cryptography', icon: <ShieldIcon size={22} /> },
]

export const DIFFICULTIES: { value: ChallengeDifficulty; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
]

export function categoryLabel(category: ChallengeCategory): string {
  return CATEGORIES.find((item) => item.value === category)?.label ?? category
}

export function categoryIcon(category: ChallengeCategory): ReactNode {
  return CATEGORIES.find((item) => item.value === category)?.icon ?? null
}

export function difficultyLabel(difficulty: ChallengeDifficulty): string {
  return DIFFICULTIES.find((item) => item.value === difficulty)?.label ?? difficulty
}

/** 1536 becomes "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Matches the limit on the server. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024
