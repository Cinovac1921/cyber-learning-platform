import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { getCourse, getLesson, setLessonCompleted } from '../../api/courses'
import { useReloadableResource, useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { CourseOutline } from './CourseOutline'
import { LessonActions } from './LessonActions'
import { LessonContent } from './LessonContent'
import { useFocusMode } from './useFocusMode'

export function LessonPage() {
  const { slug = '', position = '' } = useParams()
  const number = Number(position)
  const key = `lesson:${slug}:${position}`
  const navigate = useNavigate()
  const [focus, setFocus] = useFocusMode()

  const lesson = useResource(key, (signal) =>
    Number.isInteger(number) && number > 0
      ? getLesson(slug, number, signal)
      : Promise.reject(new ApiError(404, 'Lesson not found.', null)),
  )
  const { resource: course, reload: reloadCourse } = useReloadableResource(`course:${slug}`, (signal) =>
    getCourse(slug, signal),
  )

  // What the student just clicked, which can be newer than what the page loaded.
  const [override, setOverride] = useState<{ key: string; completed: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  async function save(completed: boolean, goTo?: string) {
    setSaving(true)
    setSaveFailed(false)
    try {
      await setLessonCompleted(slug, number, completed)
      setOverride({ key, completed })
      reloadCourse()
      if (goTo) navigate(goTo)
    } catch {
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }

  if (lesson.status === 'error') return <ErrorNotice error={lesson.error} />
  if (course.status === 'error') return <ErrorNotice error={course.error} />
  if (lesson.status === 'loading' || course.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading lesson…
      </p>
    )
  }

  const { title, content, previousPosition, nextPosition } = lesson.data
  const completed = override?.key === key ? override.completed : lesson.data.completed
  const lessons = course.data.lessons.map((item) =>
    item.position === lesson.data.position ? { ...item, completed } : item,
  )

  const courseHref = `/courses/${slug}`
  const previousHref = previousPosition ? `${courseHref}/lessons/${previousPosition}` : null
  const nextHref = nextPosition ? `${courseHref}/lessons/${nextPosition}` : null

  const actions = (
    <LessonActions
      completed={completed}
      saving={saving}
      courseHref={courseHref}
      previousHref={previousHref}
      nextHref={nextHref}
      onComplete={() => void save(true)}
      onCompleteAndContinue={() => void save(true, nextHref ?? courseHref)}
      onUndo={() => void save(false)}
    />
  )

  const saveError = saveFailed && (
    <p className="notice notice--error" role="alert">
      Couldn't save your progress. Check your connection and try again.
    </p>
  )

  if (focus) {
    return (
      <article className="lesson-focus">
        <div className="lesson-focus__top">
          <span>
            {course.data.title} · Lesson {lesson.data.position} of {lessons.length}
          </span>
          <button type="button" className="button button--quiet button--small" onClick={() => setFocus(false)}>
            Exit focus mode ✕
          </button>
        </div>

        <ol className="segments" aria-label="Course progress">
          {lessons.map((item) => (
            <li key={item.id}>
              <Link
                to={`${courseHref}/lessons/${item.position}`}
                aria-label={`Lesson ${item.position}: ${item.title}${item.completed ? ' (completed)' : ''}`}
                aria-current={item.position === lesson.data.position ? 'page' : undefined}
                className={
                  item.position === lesson.data.position ? 'is-current' : item.completed ? 'is-done' : undefined
                }
              />
            </li>
          ))}
        </ol>

        <h1>{title}</h1>
        <div className="lesson-focus__card">
          <LessonContent content={content} />
        </div>
        {saveError}
        {actions}
      </article>
    )
  }

  return (
    <div className="lesson-layout">
      <aside className="lesson-layout__side">
        <CourseOutline
          title={course.data.title}
          slug={slug}
          lessons={lessons}
          currentPosition={lesson.data.position}
        />
      </aside>

      <article className="lesson-layout__main">
        <header className="lesson__header">
          <div>
            <span className="chip">
              Lesson {lesson.data.position} of {lessons.length}
            </span>
            <h1>{title}</h1>
          </div>
          <button type="button" className="button button--quiet button--small" onClick={() => setFocus(true)}>
            Focus mode
          </button>
        </header>

        <LessonContent content={content} />
        {saveError}
        <div className="lesson-actions-wrap">{actions}</div>
      </article>
    </div>
  )
}