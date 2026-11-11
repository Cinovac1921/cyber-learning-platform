/** One row on the assessments list. */
export interface AssessmentSummary {
  id: number
  title: string
  description: string
  passPercent: number
  course: { title: string; slug: string }
  questionCount: number
  /** How many times this student has submitted it. */
  tries: number
  /** The student's best score in percent, or null before the first try. */
  bestPercent: number | null
  passed: boolean
}

export interface QuizOption {
  id: number
  text: string
}

/** A question as the student sees it before answering: no hint about the right option. */
export interface QuizQuestion {
  id: number
  position: number
  prompt: string
  options: QuizOption[]
}

export interface Quiz {
  id: number
  title: string
  description: string
  passPercent: number
  course: { title: string; slug: string }
  questions: QuizQuestion[]
  tries: number
  bestPercent: number | null
}

export interface AnswerInput {
  questionId: number
  optionId: number
}

/** One question of a finished attempt, with the right answer revealed. */
export interface ReviewQuestion {
  id: number
  position: number
  prompt: string
  explanation: string
  selectedOptionId: number | null
  correctOptionId: number | null
  isCorrect: boolean
  options: QuizOption[]
}

export interface AttemptResult {
  id: number
  correct: number
  total: number
  percent: number
  passed: boolean
  createdAt: string
  assessment: {
    id: number
    title: string
    passPercent: number
    course: { title: string; slug: string }
  }
  review: ReviewQuestion[]
}
