export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

/** One row in the course list. */
export interface CourseSummary {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  lessonCount: number
}

export interface LessonOutline {
  id: number
  position: number
  title: string
}

/** One course with its lesson titles. */
export interface CourseDetail {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  lessons: LessonOutline[]
}

/** One lesson with its text. previous/next are lesson positions, or null. */
export interface LessonDetail {
  id: number
  position: number
  title: string
  content: string
  course: { title: string; slug: string }
  previousPosition: number | null
  nextPosition: number | null
}

export interface NextLesson {
  id: number
  /** Position of the lesson inside its course, starting at 1. */
  number: number
  title: string
}

export interface CourseProgress {
  id: number
  title: string
  slug: string
  completedLessons: number
  totalLessons: number
  /** null once every lesson is finished. */
  nextLesson: NextLesson | null
}

export interface WeeklyGoal {
  target: number
  completed: number
  /** Monday to Sunday: true on days the student finished a lesson. */
  activeDays: boolean[]
}

export interface DashboardData {
  courses: CourseProgress[]
  weeklyGoal: WeeklyGoal
}