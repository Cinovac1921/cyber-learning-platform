import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { listMyCourses } from '../../api/instructor'
import { listMyClassrooms } from '../../api/instructor-classrooms'
import { copyAssessment, copyCourse, copyLesson, getLibraryCourse } from '../../api/library'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { InstructorCourseSummary } from '../../types/instructor'
import { LessonContent } from '../lessons/LessonContent'
import { levelLabel } from '../courses/levels'

/** A public course that is waiting for review or live is locked, so nothing can be copied into it. */
function canReceive(course: InstructorCourseSummary): boolean {
  return !(course.scope === 'PUBLIC' && (course.reviewStatus === 'PENDING' || course.reviewStatus === 'APPROVED'))
}

function courseLabel(course: InstructorCourseSummary): string {
  return course.scope === 'CLASSROOM' && course.classroom ? `${course.title} (${course.classroom.name})` : course.title
}

export function LibraryCoursePage() {
  const { id = '' } = useParams()
  const courseId = Number(id)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [target, setTarget] = useState(params.get('target') ?? '')
  const [classroom, setClassroom] = useState('')
  const [message, setMessage] = useState<{ text: string; courseId: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const detail = useResource(`library-course:${id}`, (signal) =>
    Number.isInteger(courseId) && courseId > 0
      ? getLibraryCourse(courseId, signal)
      : Promise.reject(new ApiError(404, 'That course is not in the library.', null)),
  )
  const myCourses = useResource('instructor-courses', (signal) => listMyCourses(signal))
  const classrooms = useResource('instructor-classrooms', (signal) => listMyClassrooms(signal))

  if (detail.status === 'loading' || myCourses.status === 'loading' || classrooms.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading…
      </p>
    )
  }
  if (detail.status === 'error') return <ErrorNotice error={detail.error} />
  if (myCourses.status === 'error') return <ErrorNotice error={myCourses.error} />
  if (classrooms.status === 'error') return <ErrorNotice error={classrooms.error} />

  const course = detail.data
  const receivers = myCourses.data.filter(canReceive)
  const chosen = receivers.find((candidate) => String(candidate.id) === target) ?? null
  const classroomId = classrooms.data.some((item) => String(item.id) === classroom)
    ? classroom
    : classrooms.data[0]
      ? String(classrooms.data[0].id)
      : ''

  /** Runs a copy, shows a readable error if it fails, and says where the copy went. */
  async function run(action: () => Promise<unknown>, done: string, openCourseId: number) {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      await action()
      setMessage({ text: done, courseId: openCourseId })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Can't reach the server. Check that the backend is running.")
    } finally {
      setBusy(false)
    }
  }

  async function copyWholeCourse() {
    if (classroomId === '') return
    setError(null)
    setBusy(true)
    try {
      const created = await copyCourse(Number(classroomId), course.id)
      navigate(`/instructor/courses/${created.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Can't reach the server. Check that the backend is running.")
      setBusy(false)
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor/library">Library</Link>
        </p>
        <PageHeader
          title={course.title}
          description={`${course.scope === 'TEMPLATE' ? 'Template' : 'Public course'} by ${course.author.displayName} · ${levelLabel(course.level)}`}
        />
        <p className="course-card__meta">{course.summary}</p>
      </div>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice notice--ok" role="status">
          {message.text} <Link to={`/instructor/courses/${message.courseId}`}>Open the course</Link>
        </p>
      )}

      <section className="editor__section">
        <h2>Copy the whole course</h2>
        {classrooms.data.length === 0 ? (
          <p className="course-card__meta">
            You need a classroom first. <Link to="/instructor/classrooms/new">Create one</Link>.
          </p>
        ) : (
          <div className="form">
            <label>
              Into which classroom?
              <select value={classroomId} onChange={(event) => setClassroom(event.target.value)}>
                {classrooms.data.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>
              <span className="form__hint">
                You get your own private copy. Its lessons start hidden
                {course.assessments.length > 0 ? ' and its quizzes unpublished' : ''}, so you can edit before students see it.
              </span>
            </label>
            <button type="button" className="button" disabled={busy} onClick={() => void copyWholeCourse()}>
              Copy course
            </button>
          </div>
        )}
      </section>

      <section className="editor__section">
        <h2>Or copy single pieces</h2>
        <div className="form">
          <label>
            Into which of your courses?
            <select value={chosen ? String(chosen.id) : ''} onChange={(event) => setTarget(event.target.value)}>
              <option value="">Choose a course…</option>
              {receivers.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {courseLabel(item)}
                </option>
              ))}
            </select>
            <span className="form__hint">
              Lessons can go into any course you can edit. Quizzes can only go into classroom courses.
            </span>
          </label>
        </div>
      </section>

      <section className="editor__section">
        <h2>Lessons ({course.lessons.length})</h2>
        {course.lessons.map((lesson) => (
          <article key={lesson.id} className="review-block">
            <h3>
              {lesson.position}. {lesson.title}
              <button
                type="button"
                className="button button--quiet button--small"
                disabled={busy || !chosen}
                onClick={() =>
                  chosen &&
                  void run(
                    () => copyLesson(chosen.id, lesson.id),
                    `Copied "${lesson.title}" into ${chosen.title}. It is hidden until you show it.`,
                    chosen.id,
                  )
                }
              >
                Copy lesson
              </button>
            </h3>
            <LessonContent content={lesson.content} />
          </article>
        ))}
      </section>

      {course.assessments.length > 0 && (
        <section className="editor__section">
          <h2>Quizzes ({course.assessments.length})</h2>
          {course.assessments.map((quiz) => (
            <article key={quiz.id} className="review-block">
              <h3>
                {quiz.title}
                <span className="chip">{quiz.questionCount} questions</span>
                <span className="chip">Pass mark {quiz.passPercent}%</span>
                <button
                  type="button"
                  className="button button--quiet button--small"
                  disabled={busy || !chosen || chosen.scope !== 'CLASSROOM'}
                  onClick={() =>
                    chosen &&
                    void run(
                      () => copyAssessment(chosen.id, quiz.id),
                      `Copied "${quiz.title}" into ${chosen.title}. It is unpublished until you publish it.`,
                      chosen.id,
                    )
                  }
                >
                  Copy quiz
                </button>
              </h3>
              {quiz.description && <p className="course-card__meta">{quiz.description}</p>}
              {chosen && chosen.scope !== 'CLASSROOM' && (
                <p className="course-card__meta">Quizzes can only be copied into a classroom course.</p>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
