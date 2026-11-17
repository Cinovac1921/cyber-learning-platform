import type { CourseLevel } from './learning'

export interface LibraryItem {
  id: number
  title: string
  summary: string
  level: CourseLevel
  scope: 'TEMPLATE' | 'PUBLIC'
  author: { displayName: string }
  lessonCount: number
  /** Only template quizzes can be copied, so this is 0 for public courses. */
  quizCount: number
}

export interface LibraryList {
  templates: LibraryItem[]
  publicCourses: LibraryItem[]
}

export interface LibraryDetail {
  id: number
  title: string
  summary: string
  level: CourseLevel
  scope: 'TEMPLATE' | 'PUBLIC'
  author: { displayName: string }
  lessons: { id: number; position: number; title: string; content: string }[]
  assessments: { id: number; title: string; description: string; passPercent: number; questionCount: number }[]
}
