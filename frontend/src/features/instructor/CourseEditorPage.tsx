import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  deleteCourse,
  deleteLesson,
  getMyCourse,
  moveLesson,
  updateCourse,
} from '../../api/instructor'
import { useReloadableResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { CourseInput } from '../../types/instructor'
import { CourseForm } from './CourseForm'

export function CourseEditorPage() {
  const { id = '' } = useParams()
  const courseId = Number(id)
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)

  const { resource: course, reload } = useReloadableResource(`instructor-course:${id}`, (signal) =>
    Number.isInteger(courseId) && courseId > 0
      ? getMyCourse(courseId, signal)
      : Promise.reject(new ApiError(404, 'Course not found.', null)),
  )

  /** Runs an action, shows a readable error if it fails, and refreshes the data. */
  async function run(action: () => Promise<unknown>) {
    setActionError(null)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Can't reach the server. Check that the backend is running.",
      )
    }
  }

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

  const { title, slug, summary, level, published, lessons } = course.data
  const details: CourseInput = { title, summary, level }

  async function saveDetails(values: CourseInput) {
    await updateCourse(courseId, values)
    reload()
  }

  async function removeCourse() {
    if (!window.confirm(`Delete "${title}"? Its lessons and students' progress on them will be deleted too.`)) {
      return
    }
    setActionError(null)
    try {
      await deleteCourse(courseId)
      navigate('/instructor')
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Can't reach the server.")
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor">Instructor</Link>
        </p>
        <PageHeader
          title={title}
          actions={
            <>
              {published && (
                <Link to={`/courses/${slug}`} className="button button--quiet">
                  View as student
                </Link>
              )}
              <button
                type="button"
                className={published ? 'button button--quiet' : 'button'}
                onClick={() => void run(() => updateCourse(courseId, { published: !published }))}
              >
                {published ? 'Unpublish' : 'Publish'}
              </button>
            </>
          }
        />
        <p className="toolbar">
          <span className={published ? 'chip chip--live' : 'chip'}>{published ? 'Published' : 'Draft'}</span>
          <span className="course-card__meta">
            {published
              ? 'Students can see this course.'
              : 'Only you can see this course. Add lessons, then publish.'}
          </span>
        </p>
      </div>

      {actionError && (
        <p className="notice notice--error" role="alert">
          {actionError}
        </p>
      )}

      <section className="editor__section">
        <h2>Details</h2>
        <CourseForm initial={details} submitLabel="Save details" onSubmit={saveDetails} />
      </section>

      <section className="editor__section">
        <div className="editor__heading">
          <h2>Lessons</h2>
          <Link to={`/instructor/courses/${courseId}/lessons/new`} className="button button--small">
            + Add lesson
          </Link>
        </div>

        {lessons.length === 0 ? (
          <p className="loading">No lessons yet. Add the first one.</p>
        ) : (
          <ol className="lesson-rows">
            {lessons.map((lesson, index) => (
              <li key={lesson.id} className="lesson-row">
                <span className="lesson-list__number" aria-hidden="true">
                  {lesson.position}
                </span>
                <span className="lesson-row__title">{lesson.title}</span>
                <span className="row-actions">
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    aria-label={`Move "${lesson.title}" up`}
                    disabled={index === 0}
                    onClick={() => void run(() => moveLesson(lesson.id, 'up'))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    aria-label={`Move "${lesson.title}" down`}
                    disabled={index === lessons.length - 1}
                    onClick={() => void run(() => moveLesson(lesson.id, 'down'))}
                  >
                    ↓
                  </button>
                  <Link
                    to={`/instructor/courses/${courseId}/lessons/${lesson.id}`}
                    className="button button--quiet button--small"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="button button--danger button--small"
                    onClick={() => {
                      if (window.confirm(`Delete the lesson "${lesson.title}"?`)) {
                        void run(() => deleteLesson(lesson.id))
                      }
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="editor__section">
        <h2>Delete course</h2>
        <p className="course-card__meta">
          This removes the course, all its lessons, and every student's progress on them. It can't be undone.
        </p>
        <button type="button" className="button button--danger" onClick={() => void removeCourse()}>
          Delete this course
        </button>
      </section>
    </div>
  )
}