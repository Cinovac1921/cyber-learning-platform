import type { CourseLevel } from './learning'

export interface InstructorCourseSummary {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  published: boolean
  updatedAt: string
  lessonCount: number
}

export interface InstructorLesson {
  id: number
  position: number
  title: string
  content: string
}

export interface InstructorCourse {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  published: boolean
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
