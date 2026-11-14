import type { ComponentType } from 'react'
import { Link, useParams } from 'react-router'
import { getCourse } from '../../api/courses'
import { useResource } from '../../app/useResource'
import { ShieldArt } from '../../components/Brand'
import { ErrorNotice } from '../../components/ErrorNotice'
import {
  ArrowLeftIcon,
  CapIcon,
  CheckCircleIcon,
  CheckIcon,
  ChartIcon,
  ChevronRightIcon,
  DatabaseIcon,
  GlobeIcon,
  KeyboardIcon,
  ListIcon,
  PlayCircleIcon,
  PlayIcon,
} from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { ProgressRing } from '../dashboard/ProgressRing'
import { levelLabel } from './levels'

const STATUS_LABEL = { done: 'Completed', now: 'Up next', todo: 'Not started' } as const

/** Lessons have no artwork of their own, so each one cycles through a small set of icons. */
const LESSON_ICONS: ComponentType<{ size?: number }>[] = [GlobeIcon, KeyboardIcon, DatabaseIcon]

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
  const lessonCountLabel = `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}`

  const ctaLabel =
    completedLessons === 0
      ? 'Start course'
      : next
        ? `Continue · Lesson ${next.number}`
        : 'Review course'

  return (
    <>
      <div className="course-hero">
        <p className="breadcrumb">
          <Link to="/courses">
            <ArrowLeftIcon size={20} />
            Courses
          </Link>
        </p>
        <PageHeader title={title} description={summary} />
        <ShieldArt />
      </div>

      <div className="course-layout">
        {lessons.length === 0 ? (
          <p className="loading">This course has no lessons yet.</p>
        ) : (
          <ol className="timeline">
            {lessons.map((lesson, index) => {
              const state = lesson.completed ? 'done' : lesson.id === next?.id ? 'now' : 'todo'
              const LessonIcon = LESSON_ICONS[index % LESSON_ICONS.length]
              return (
                <li key={lesson.id} className={`timeline__item timeline__item--${state}`}>
                  <span className={state === 'todo' ? 'step' : `step step--${state}`} aria-hidden="true">
                    {state === 'done' && <CheckIcon size={22} />}
                  </span>
                  <Link to={`/courses/${slug}/lessons/${lesson.position}`} className="timeline__card">
                    <span className="timeline__tile" aria-hidden="true">
                      <LessonIcon size={34} />
                    </span>
                    <span className="timeline__text">
                      <span className="timeline__eyebrow">Lesson {lesson.number}</span>
                      <span className="timeline__title">{lesson.title}</span>
                      <span className="timeline__status">
                        {state === 'done' && <CheckCircleIcon size={20} style={{ color: 'var(--ok)' }} />}
                        {state === 'now' && <PlayCircleIcon size={20} />}
                        {STATUS_LABEL[state]}
                      </span>
                    </span>
                    <span className="timeline__go" aria-hidden="true">
                      <ChevronRightIcon size={20} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}

        <aside className="panel course-aside">
          <div className="course-aside__title">
            <span className="tile" aria-hidden="true">
              <ChartIcon size={22} />
            </span>
            <h2>Your progress</h2>
          </div>
          <div className="course-aside__ring">
            <ProgressRing percent={percent} color="var(--accent)" size={176} thickness={9} />
          </div>
          <p className="course-aside__meta">
            {completedLessons} of {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} done
          </p>
          {target && (
            <Link to={`/courses/${slug}/lessons/${target.position}`} className="button button--block">
              <PlayIcon size={18} />
              {ctaLabel}
            </Link>
          )}
          <div className="course-aside__tags">
            <span className="chip">
              <CapIcon size={18} />
              {levelLabel(level)}
            </span>
            <span className="chip">
              <ListIcon size={18} />
              {lessonCountLabel}
            </span>
          </div>
        </aside>
      </div>
    </>
  )
}
