import type { ChallengeDifficulty } from '../../types/challenges'
import { difficultyLabel } from './meta'

export function DifficultyChip({ difficulty }: { difficulty: ChallengeDifficulty }) {
  return <span className={`chip chip--${difficulty.toLowerCase()}`}>{difficultyLabel(difficulty)}</span>
}
