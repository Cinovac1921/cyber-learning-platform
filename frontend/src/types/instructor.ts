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