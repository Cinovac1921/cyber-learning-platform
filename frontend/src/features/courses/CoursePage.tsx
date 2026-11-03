import { Link, useParams } from 'react-router'
import { getCourse } from '../../api/courses'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { ProgressRing } from '../dashboard/ProgressRing'
import { levelLabel } from './levels'

const STATUS_LABEL = { done: 'Completed', now: 'Up next', todo: 'Not started' } as const

export function CoursePage() {
  const { slug = '' } = useParams()
  const course = useResource(`course:${slug}`, (signal) => getCourse(slug, signal))

  if (course.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading course…
      </p>
    )
  }

  if (course.status === 'error') {
    return <ErrorNotice error={course.error} />
  }

  const { title, summary, level, lessons, completedLessons } = course.data
  const next = lessons.find((lesson) => !lesson.completed)
  const target = next ?? lessons[0]
  const percent = lessons.length === 0 ? 0 : Math.round((completedLessons / lessons.length) * 100)

  const ctaLabel =
    completedLessons === 0
      ? 'Start course'
      : next
        ? `Continue · Lesson ${next.position}`
        : 'Review course'

  return (
    <>
      <p className="breadcrumb">
        <Link to="/courses">Courses</Link>
      </p>
      <PageHeader title={title} description={summary} />

      <div className="course-layout">
        {lessons.length === 0 ? (
          <p className="loading">This course has no lessons yet.</p>
        ) : (
          <ol className="timeline">
            {lessons.map((lesson) => {
              const state = lesson.completed ? 'done' : lesson.id === next?.id ? 'now' : 'todo'
              return (
                <li key={lesson.id} className={`timeline__item timeline__item--${state}`}>
                  <span className={state === 'todo' ? 'step' : `step step--${state}`} aria-hidden="true">
                    {state === 'done' ? '✓' : state === 'now' ? '●' : ''}
                  </span>
                  <Link to={`/courses/${slug}/lessons/${lesson.position}`} className="timeline__card">
                    <span className="timeline__eyebrow">Lesson {lesson.position}</span>
                    <span className="timeline__title">{lesson.title}</span>
                    <span className="timeline__status">{STATUS_LABEL[state]}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}

        <aside className="panel course-aside">
          <h2>Your progress</h2>
          <ProgressRing percent={percent} color="var(--focus)" />
          <p className="course-aside__meta">
            {completedLessons} of {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} done
          </p>
          {target && (
            <Link to={`/courses/${slug}/lessons/${target.position}`} className="button button--block">
              {ctaLabel}
            </Link>
          )}
          <div className="course-aside__tags">
            <span className="chip">{levelLabel(level)}</span>
            <span className="chip">
              {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>
        </aside>
      </div>
    </>
  )
}