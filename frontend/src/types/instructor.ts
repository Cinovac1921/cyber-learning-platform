import type { CourseLevel } from './learning'

/** PUBLIC shows in the public library. TEMPLATE is starter content students never see. */
export type CourseScope = 'PUBLIC' | 'TEMPLATE' | 'CLASSROOM'

/** Where a public-library course stands: a draft, waiting for an admin, live, or sent back. */
export type ReviewStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface InstructorCourseSummary {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  published: boolean
  scope: CourseScope
  reviewStatus: ReviewStatus
  classroom: { name: string } | null
  updatedAt: string
  lessonCount: number
}

export interface InstructorLesson {
  id: number
  position: number
  title: string
  content: string
  visible: boolean
}

export interface InstructorCourse {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  published: boolean
  scope: CourseScope
  reviewStatus: ReviewStatus
  /** The admin's reason, when the course was rejected or taken down. */
  reviewNote: string | null
  /** Set when the course was made by copying one from the library. */
  copiedFrom: { title: string } | null
  classroom: { id: number; name: string } | null
  lessons: InstructorLesson[]
}

export interface CourseInput {
  title: string
  summary: string
  level: CourseLevel
  /** Create the course inside one of the instructor's classrooms. Leave out for the public library. */
  classroomId?: number
  /** Admins only: start the course as a template for instructors to copy from. */
  scope?: 'TEMPLATE'
}

export interface LessonInput {
  title: string
  content: string
  visible?: boolean
}
export interface InstructorAssessmentSummary {
  id: number
  title: string
  description: string
  passPercent: number
  published: boolean
  questionCount: number
  attemptCount: number
}

export interface InstructorOption {
  id: number
  text: string
  isCorrect: boolean
}

export interface InstructorQuestion {
  id: number
  position: number
  prompt: string
  explanation: string
  options: InstructorOption[]
}

export interface InstructorAssessment {
  id: number
  title: string
  description: string
  passPercent: number
  published: boolean
  course: { id: number; title: string }
  attemptCount: number
  questions: InstructorQuestion[]
}

export interface AssessmentInput {
  title: string
  description: string
  passPercent: number
}

export interface QuestionInput {
  prompt: string
  explanation: string
  options: { text: string; isCorrect: boolean }[]
}
