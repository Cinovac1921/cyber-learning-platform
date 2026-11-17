import type { CourseLevel } from './learning'

/** A classroom the student has joined. */
export interface ClassroomSummary {
  id: number
  name: string
  description: string
  instructorName: string
  courseCount: number
}

export interface ClassroomCourse {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  lessonCount: number
  completedLessons: number
}

export interface ClassroomDetail {
  id: number
  name: string
  description: string
  instructorName: string
  courses: ClassroomCourse[]
}

/** One row in the instructor's list of classrooms. */
export interface InstructorClassroomSummary {
  id: number
  name: string
  description: string
  joinOpen: boolean
  memberCount: number
  courseCount: number
}

export interface ClassroomMemberRow {
  userId: number
  displayName: string
  email: string
  joinedAt: string
}

export interface InstructorClassroom {
  id: number
  name: string
  description: string
  /** Shown as ABCD-EFGH. */
  joinCode: string
  joinOpen: boolean
  members: ClassroomMemberRow[]
  courses: { id: number; title: string; published: boolean; lessonCount: number }[]
}

export interface ClassroomInput {
  name: string
  description: string
}

/** How a classroom's students are doing in the classroom's own courses and quizzes. */
export interface ClassroomProgress {
  classroom: { id: number; name: string }
  courses: { id: number; title: string; lessonCount: number; finishedCount: number }[]
  quizzes: { id: number; courseId: number; title: string; passPercent: number; passedCount: number }[]
  students: {
    userId: number
    displayName: string
    email: string
    joinedAt: string
    lastActiveAt: string | null
    courses: { courseId: number; completedLessons: number }[]
    quizzes: { assessmentId: number; attempts: number; bestPercent: number | null; passed: boolean }[]
  }[]
}
