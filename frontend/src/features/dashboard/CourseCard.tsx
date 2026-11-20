import { Link } from 'react-router'
import { ArrowRightIcon } from '../../components/Icons'
import { ProgressBar } from '../../components/ProgressBar'
import type { CourseProgress } from '../../types/learning'

function describeProgress(percent: number): string {
  if (percent >= 100) return 'Completed'
  if (percent >= 80) return 'Almost done'
  if (percent < 20) return 'Just started'
  return 'In progress'
}

export function CourseCard({ course, index }: { course: CourseProgress; index: number }) {
  const percent =
    course.totalLessons === 0
      ? 0
      : Math.round((course.completedLessons / course.totalLessons) * 100)
  const next = course.nextLesson

  return (
    <article className="course-card">
      <div className="course-card__head">
        <span className="label">Course / {String(index + 1).padStart(3, '0')}</span>
        <span className={percent >= 100 ? 'chip chip--live' : 'chip'}>{describeProgress(percent)}</span>
      </div>
      <div className="course-card__top">
        <h3>{course.title}</h3>
        <p>
          {course.completedLessons} of {course.totalLessons} lessons
        </p>
      </div>
      <div className="course-card__progress">
        <span className="numeral">{percent}%</span>
        <ProgressBar done={course.completedLessons} total={course.totalLessons} />
      </div>
      {next ? (
        <Link to={`/courses/${course.slug}/lessons/${next.position}`} className="button button--block">
          Continue · Lesson {next.number} <ArrowRightIcon size={16} />
        </Link>
      ) : (
        <Link to="/courses" className="button button--quiet button--block">
          Review course
        </Link>
      )}
    </article>
  )
}
