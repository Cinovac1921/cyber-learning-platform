import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  deleteCourse,
  deleteLesson,
  getMyCourse,
  listCourseAssessments,
  moveLesson,
  submitCourseForReview,
  updateCourse,
  updateLesson,
  withdrawCourse,
} from '../../api/instructor'
import { useReloadableResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { CourseInput } from '../../types/instructor'
import { useAuth } from '../auth/useAuth'
import { levelLabel } from '../courses/levels'
import { CourseForm } from './CourseForm'
import { CourseStatusChip } from './CourseStatusChip'
import { ScopeControl } from './ScopeControl'

export function CourseEditorPage() {
  const { id = '' } = useParams()
  const courseId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [actionError, setActionError] = useState<string | null>(null)

  const { resource: course, reload } = useReloadableResource(`instructor-course:${id}`, (signal) =>
    Number.isInteger(courseId) && courseId > 0
      ? getMyCourse(courseId, signal)
      : Promise.reject(new ApiError(404, 'Course not found.', null)),
  )

  const { resource: assessments } = useReloadableResource(`instructor-course-assessments:${id}`, (signal) =>
    Number.isInteger(courseId) && courseId > 0 ? listCourseAssessments(courseId, signal) : Promise.resolve([]),
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

  const {
    title,
    slug,
    summary,
    level,
    published,
    scope,
    reviewStatus,
    reviewNote,
    copiedFrom,
    classroom,
    lessons,
  } = course.data
  const details: CourseInput = { title, summary, level }
  const isPublic = scope === 'PUBLIC'
  const isAdmin = user?.role === 'ADMIN'
  // A public course waiting for review, or live, can't be edited: withdraw it first.
  const locked = isPublic && (reviewStatus === 'PENDING' || reviewStatus === 'APPROVED')

  async function saveDetails(values: CourseInput) {
    await updateCourse(courseId, values)
    reload()
  }

  async function withdraw() {
    const question =
      reviewStatus === 'APPROVED'
        ? `Take "${title}" offline? Students will stop seeing it until an admin approves it again.`
        : `Withdraw "${title}" from review? You can edit it and submit it again.`
    if (window.confirm(question)) {
      await run(() => withdrawCourse(courseId))
    }
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
              {isPublic ? (
                locked ? (
                  <button type="button" className="button button--quiet" onClick={() => void withdraw()}>
                    Withdraw
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button"
                    onClick={() => void run(() => submitCourseForReview(courseId))}
                  >
                    {isAdmin ? 'Publish' : 'Submit for review'}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className={published ? 'button button--quiet' : 'button'}
                  onClick={() => void run(() => updateCourse(courseId, { published: !published }))}
                >
                  {published ? 'Unpublish' : 'Publish'}
                </button>
              )}
            </>
          }
        />
        <p className="toolbar">
          <CourseStatusChip scope={scope} published={published} reviewStatus={reviewStatus} />
          {scope === 'TEMPLATE' && <span className="chip">Template</span>}
          {scope === 'CLASSROOM' && classroom && <span className="chip">{classroom.name}</span>}
          {copiedFrom && <span className="chip">Based on {copiedFrom.title}</span>}
          <span className="course-card__meta">
            {scope === 'TEMPLATE'
              ? 'This is a template. Students never see it, whether or not it is published.'
              : scope === 'CLASSROOM'
                ? published
                  ? `Only the students of ${classroom?.name ?? 'this classroom'} can see this course.`
                  : 'A draft. Once published, only your classroom students can see it.'
                : reviewStatus === 'PENDING'
                  ? 'Waiting for an admin to review it.'
                  : reviewStatus === 'APPROVED'
                    ? 'Live in the public library. Everyone can see it.'
                    : reviewStatus === 'REJECTED'
                      ? 'An admin sent this back. Fix it, then submit it again.'
                      : isAdmin
                        ? 'A draft. Only you can see it. Add lessons, then publish it.'
                        : 'A draft. Only you can see it. Add lessons, then submit it for review.'}
          </span>
        </p>
      </div>

      {actionError && (
        <p className="notice notice--error" role="alert">
          {actionError}
        </p>
      )}

      {isPublic && reviewStatus === 'REJECTED' && reviewNote && (
        <p className="notice" role="status">
          <strong>Reviewer's note:</strong> {reviewNote}
        </p>
      )}

      {locked && (
        <p className="notice" role="status">
          <strong>Locked.</strong>{' '}
          {reviewStatus === 'PENDING'
            ? "This course is waiting for review, so it can't be changed. Withdraw it if you need to edit it."
            : "This course is live, so it can't be changed. Withdraw it to edit it. It will need approval again afterwards."}
        </p>
      )}

      <section className="editor__section">
        <h2>Details</h2>
        {locked ? (
          <p className="course-card__meta">
            {levelLabel(level)} · {summary}
          </p>
        ) : (
          <CourseForm initial={details} submitLabel="Save details" onSubmit={saveDetails} />
        )}
      </section>

      {user?.role === 'ADMIN' && scope !== 'CLASSROOM' && (
        <section className="editor__section">
          <h2>Visibility</h2>
          <ScopeControl scope={scope} onSave={(next) => run(() => updateCourse(courseId, { scope: next }))} />
        </section>
      )}

      <section className="editor__section">
        <div className="editor__heading">
          <h2>Lessons</h2>
          {!locked && (
            <span className="row-actions">
              <Link to={`/instructor/library?target=${courseId}`} className="button button--quiet button--small">
                Copy from library
              </Link>
              <Link to={`/instructor/courses/${courseId}/lessons/new`} className="button button--small">
                + Add lesson
              </Link>
            </span>
          )}
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
                {!lesson.visible && <span className="chip">Hidden</span>}
                {!locked && (
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
                    <button
                      type="button"
                      className="button button--quiet button--small"
                      aria-label={`${lesson.visible ? 'Hide' : 'Show'} "${lesson.title}" ${lesson.visible ? 'from' : 'to'} students`}
                      onClick={() => void run(() => updateLesson(lesson.id, { visible: !lesson.visible }))}
                    >
                      {lesson.visible ? 'Hide' : 'Show'}
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
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="editor__section">
        <div className="editor__heading">
          <h2>Assessments</h2>
          {!locked && (
            <Link to={`/instructor/courses/${courseId}/assessments/new`} className="button button--small">
              + Add assessment
            </Link>
          )}
        </div>

        {assessments.status === 'loading' && (
          <p className="loading" role="status">
            Loading assessments…
          </p>
        )}

        {assessments.status === 'error' && (
          <p className="notice notice--error" role="alert">
            Couldn't load the assessments for this course.
          </p>
        )}

        {assessments.status === 'ready' && assessments.data.length === 0 && (
          <p className="loading">No assessments yet. Add a quiz to check what students learned.</p>
        )}

        {assessments.status === 'ready' && assessments.data.length > 0 && (
          <ul className="lesson-rows">
            {assessments.data.map((item) => (
              <li key={item.id} className="lesson-row">
                <span className="lesson-row__title">{item.title}</span>
                <span className={item.published ? 'chip chip--live' : 'chip'}>
                  {item.published ? 'Published' : 'Draft'}
                </span>
                <span className="course-card__meta">
                  {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'}
                </span>
                {!locked && (
                  <Link to={`/instructor/assessments/${item.id}`} className="button button--quiet button--small">
                    Edit
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!locked && (
        <section className="editor__section">
          <h2>Delete course</h2>
          <p className="course-card__meta">
            This removes the course, all its lessons, and every student's progress on them. It can't be undone.
          </p>
          <button type="button" className="button button--danger" onClick={() => void removeCourse()}>
            Delete this course
          </button>
        </section>
      )}
    </div>
  )
}