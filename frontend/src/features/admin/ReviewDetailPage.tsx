import { useState, type SyntheticEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { approveReview, getReview, rejectReview, takedownCourse } from '../../api/admin'
import { ApiError } from '../../api/client'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { levelLabel } from '../courses/levels'
import { LessonContent } from '../lessons/LessonContent'
import { useConfirm } from '../../app/useConfirm'

export function ReviewDetailPage() {
  const confirm = useConfirm()
  const { id = '' } = useParams()
  const courseId = Number(id)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const review = useResource(`admin-review:${id}`, (signal) =>
    Number.isInteger(courseId) && courseId > 0
      ? getReview(courseId, signal)
      : Promise.reject(new ApiError(404, 'Course not found.', null)),
  )

  if (review.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading course…
      </p>
    )
  }

  if (review.status === 'error') {
    return <ErrorNotice error={review.error} />
  }

  const course = review.data

  /** Runs a decision, then goes back to the queue. A readable error is shown if it fails. */
  async function decide(action: () => Promise<unknown>) {
    setError(null)
    setBusy(true)
    try {
      await action()
      navigate('/admin/reviews')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Can't reach the server. Check that the backend is running.")
      setBusy(false)
    }
  }

  function handleNote(action: (note: string) => Promise<unknown>) {
    return (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      const note = String(new FormData(event.currentTarget).get('note')).trim()
      void decide(() => action(note))
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/admin/reviews">Review queue</Link>
        </p>
        <PageHeader
          title={course.title}
          description={`${course.author.displayName} (${course.author.email}) · ${levelLabel(course.level)}`}
        />
        <p className="course-card__meta">{course.summary}</p>
      </div>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      <section className="editor__section">
        <h2>Decision</h2>
        {course.reviewStatus === 'PENDING' && (
          <>
            <p className="course-card__meta">
              Read the lessons and quizzes below first. Approving puts the course live in the public library. The
              instructor can't change it again unless they withdraw it.
            </p>
            <div className="toolbar">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Approve this course?',
                    message: `Put "${course.title}" live in the public library?`,
                    confirmLabel: 'Approve',
                  })
                  if (ok) void decide(() => approveReview(courseId))
                }}
              >
                Approve
              </button>
            </div>
            <form className="form" onSubmit={handleNote((note) => rejectReview(courseId, note))}>
              <label>
                Or send it back with a reason
                <textarea name="note" rows={3} minLength={3} maxLength={500} required />
                <span className="form__hint">The instructor sees this note and can fix the course and resubmit.</span>
              </label>
              <button type="submit" className="button button--danger" disabled={busy}>
                Reject
              </button>
            </form>
          </>
        )}

        {course.reviewStatus === 'APPROVED' && (
          <>
            <p className="course-card__meta">This course is live. You can take it offline if there is a problem.</p>
            <form className="form" onSubmit={handleNote((note) => takedownCourse(courseId, note))}>
              <label>
                Reason for taking it down
                <textarea name="note" rows={3} minLength={3} maxLength={500} required />
                <span className="form__hint">
                  The instructor sees this note. The course goes offline and unlocks so they can fix it.
                </span>
              </label>
              <button type="submit" className="button button--danger" disabled={busy}>
                Take down
              </button>
            </form>
          </>
        )}

        {course.reviewStatus === 'REJECTED' && (
          <p className="course-card__meta">
            Sent back to the instructor. Reason given: {course.reviewNote ?? 'none'}. It comes back to the queue
            when they resubmit it.
          </p>
        )}
      </section>

      <section className="editor__section">
        <h2>Lessons ({course.lessons.length})</h2>
        {course.lessons.length === 0 && <p className="loading">No lessons.</p>}
        {course.lessons.map((lesson) => (
          <article key={lesson.id} className="review-block">
            <h3>
              {lesson.position}. {lesson.title}
              {!lesson.visible && <span className="chip">Hidden from students</span>}
            </h3>
            <LessonContent content={lesson.content} />
          </article>
        ))}
      </section>

      <section className="editor__section">
        <h2>Quizzes ({course.assessments.length})</h2>
        <p className="course-card__meta">
          Quizzes in a public course become practice quizzes: students see the correct answers after each attempt.
        </p>
        {course.assessments.length === 0 && <p className="loading">No quizzes.</p>}
        {course.assessments.map((quiz) => (
          <article key={quiz.id} className="review-block">
            <h3>
              {quiz.title}
              <span className="chip">{quiz.published ? 'Published' : 'Draft'}</span>
              <span className="chip">Pass mark {quiz.passPercent}%</span>
            </h3>
            {quiz.description && <p className="course-card__meta">{quiz.description}</p>}
            <ol className="review-questions">
              {quiz.questions.map((question) => (
                <li key={question.id}>
                  <p>{question.prompt}</p>
                  <ul className="review-options">
                    {question.options.map((option) => (
                      <li key={option.id} className={option.isCorrect ? 'review-option--correct' : undefined}>
                        {option.text}
                        {option.isCorrect && <span className="chip chip--live">Correct</span>}
                      </li>
                    ))}
                  </ul>
                  {question.explanation && <p className="course-card__meta">Explanation: {question.explanation}</p>}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
    </div>
  )
}
