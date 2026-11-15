import type { CourseLevel } from './learning'
import type { ReviewStatus } from './instructor'

export interface ReviewAuthor {
  displayName: string
  email: string
}

export interface ReviewListItem {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  submittedAt: string | null
  reviewedAt: string | null
  author: ReviewAuthor
  lessonCount: number
}

export interface ReviewList {
  pending: ReviewListItem[]
  live: ReviewListItem[]
}

export interface ReviewDetail {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  reviewStatus: ReviewStatus
  reviewNote: string | null
  submittedAt: string | null
  reviewedAt: string | null
  author: ReviewAuthor
  lessons: { id: number; position: number; title: string; content: string; visible: boolean }[]
  assessments: {
    id: number
    title: string
    description: string
    passPercent: number
    published: boolean
    questions: {
      id: number
      prompt: string
      explanation: string
      options: { id: number; text: string; isCorrect: boolean }[]
    }[]
  }[]
}
