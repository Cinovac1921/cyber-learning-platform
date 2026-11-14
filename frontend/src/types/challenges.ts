export type ChallengeCategory =
  | 'NETWORK_ANALYSIS'
  | 'FORENSICS'
  | 'WEB'
  | 'REVERSE_ENGINEERING'
  | 'CRYPTOGRAPHY'

export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

/** One card on the challenges page. */
export interface ChallengeSummary {
  id: number
  title: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  points: number
  hasFile: boolean
  /** How many students have solved it. */
  solveCount: number
  solved: boolean
}

export interface ChallengeFile {
  name: string
  /** Size in bytes. */
  size: number
}

/** A challenge as a student sees it. The flag is never sent. */
export interface Challenge {
  id: number
  title: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  points: number
  description: string
  hint: string
  file: ChallengeFile | null
  solveCount: number
  solved: boolean
  solvedAt: string | null
}

export interface FlagResult {
  correct: boolean
  /** True when the student had already solved it, so no new points were given. */
  alreadySolved: boolean
  /** Points awarded by this submission. */
  points: number
}

export interface LeaderboardRow {
  rank: number
  displayName: string
  points: number
  solves: number
}

export interface Leaderboard {
  top: LeaderboardRow[]
  /** The signed-in student's own row, or null if they have no points yet. */
  me: LeaderboardRow | null
}

/** One row on the instructor's challenge list. */
export interface InstructorChallengeSummary {
  id: number
  title: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  points: number
  published: boolean
  hasFile: boolean
  solveCount: number
}

export interface InstructorChallenge {
  id: number
  title: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  points: number
  description: string
  hint: string
  published: boolean
  /** The flag cannot be read back. This only says that one is set. */
  flagSet: boolean
  file: ChallengeFile | null
  solveCount: number
}

export interface ChallengeInput {
  title: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  points: number
  description: string
  hint: string
  /** Required when creating. When editing, leave out to keep the current flag. */
  flag?: string
}
