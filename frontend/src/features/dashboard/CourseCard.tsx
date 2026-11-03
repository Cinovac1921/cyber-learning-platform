import { Link } from 'react-router'
import type { CourseProgress } from '../../types/learning'
import { ProgressRing } from './ProgressRing'

function describeProgress(percent: number): string {
  if (percent >= 100) return 'Completed'
  if (percent >= 80) return 'Almost done'
  if (percent < 20) return 'Just started'
  return 'In progress'
}

export function CourseCard({ course, colorIndex }: { course: CourseProgress; colorIndex: number }) {
  const percent =
    course.totalLessons === 0
      ? 0
      : Math.round((course.completedLessons / course.totalLessons) * 100)
  const next = course.nextLesson

  return (
    <article className="course-card">
      <div className="course-card__top">
        <ProgressRing percent={percent} color={`var(--course-${(colorIndex % 3) + 1})`} />
        <div>
          <h3>{course.title}</h3>
          <p>
            {course.completedLessons} of {course.totalLessons} lessons
          </p>
        </div>
      </div>
      <span className="chip">{describeProgress(percent)}</span>
      {next ? (
        <Link to={`/courses/${course.slug}/lessons/${next.number}`} className="button button--block">
          Continue · Lesson {next.number}
        </Link>
      ) : (
        <Link to="/courses" className="button button--quiet button--block">
          Review course
        </Link>
      )}
    </article>
  )
}