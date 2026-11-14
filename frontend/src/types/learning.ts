export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

/** One row in the course list. */
export interface CourseSummary {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  lessonCount: number
  completedLessons: number
}

export interface LessonOutline {
  id: number
  /** Place in the course. It is the lesson's URL, so it can skip a number when a lesson is hidden. */
  position: number
  /** What the student reads ("Lesson 2"): counts only the lessons they can see. */
  number: number
  title: string
  completed: boolean
}

/** One course with its lessons. */
export interface CourseDetail {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  completedLessons: number
  lessons: LessonOutline[]
}

/** One lesson with its text. previous/next are lesson positions, or null. */
export interface LessonDetail {
  id: number
  position: number
  number: number
  title: string
  content: string
  completed: boolean
  course: { title: string; slug: string }
  previousPosition: number | null
  nextPosition: number | null
}

export interface NextLesson {
  id: number
  /** What the student reads ("Lesson 2"), counting only visible lessons. */
  number: number
  /** The lesson's place in the course, used in its URL. */
  position: number
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

/** A public course the student has not started yet. */
export interface LibraryCourse {
  id: number
  title: string
  slug: string
  summary: string
  level: CourseLevel
  lessonCount: number
}

export interface DashboardData {
  courses: CourseProgress[]
  library: LibraryCourse[]
  weeklyGoal: WeeklyGoal
}