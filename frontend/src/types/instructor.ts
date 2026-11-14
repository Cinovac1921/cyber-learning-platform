import type { CourseLevel } from './learning'

/** PUBLIC shows in the public library. TEMPLATE is starter content students never see. */
export type CourseScope = 'PUBLIC' | 'TEMPLATE'

export interface InstructorCourseSummary {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  published: boolean
  scope: CourseScope
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
  lessons: InstructorLesson[]
}

export interface CourseInput {
  title: string
  summary: string
  level: CourseLevel
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
