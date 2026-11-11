import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  addQuestion,
  deleteAssessment,
  deleteQuestion,
  getMyAssessment,
  moveQuestion,
  updateAssessment,
  updateQuestion,
} from '../../api/instructor'
import { useReloadableResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { AssessmentInput, QuestionInput } from '../../types/instructor'
import { AssessmentForm } from './AssessmentForm'
import { QuestionForm } from './QuestionForm'

export function AssessmentEditorPage() {
  const { assessmentId = '' } = useParams()
  const id = Number(assessmentId)
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  /** The question being edited, 'new' while writing a new one, or null. */
  const [editing, setEditing] = useState<number | 'new' | null>(null)

  const { resource: assessment, reload } = useReloadableResource(`instructor-assessment:${assessmentId}`, (signal) =>
    Number.isInteger(id) && id > 0
      ? getMyAssessment(id, signal)
      : Promise.reject(new ApiError(404, 'Assessment not found.', null)),
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

  if (assessment.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading assessment…
      </p>
    )
  }

  if (assessment.status === 'error') {
    return <ErrorNotice error={assessment.error} />
  }

  const { title, description, passPercent, published, course, questions, attemptCount } = assessment.data
  const details: AssessmentInput = { title, description, passPercent }

  async function saveDetails(values: AssessmentInput) {
    await updateAssessment(id, values)
    reload()
  }

  async function saveNewQuestion(values: QuestionInput) {
    await addQuestion(id, values)
    setEditing(null)
    reload()
  }

  async function saveQuestion(questionId: number, values: QuestionInput) {
    await updateQuestion(questionId, values)
    setEditing(null)
    reload()
  }

  async function removeAssessment() {
    if (!window.confirm(`Delete "${title}"? Its questions and every student's attempts will be deleted too.`)) {
      return
    }
    setActionError(null)
    try {
      await deleteAssessment(id)
      navigate(`/instructor/courses/${course.id}`)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Can't reach the server.")
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to={`/instructor/courses/${course.id}`}>{course.title}</Link>
        </p>
        <PageHeader
          title={title}
          actions={
            <button
              type="button"
              className={published ? 'button button--quiet' : 'button'}
              onClick={() => void run(() => updateAssessment(id, { published: !published }))}
            >
              {published ? 'Unpublish' : 'Publish'}
            </button>
          }
        />
        <p className="toolbar">
          <span className={published ? 'chip chip--live' : 'chip'}>{published ? 'Published' : 'Draft'}</span>
          <span className="course-card__meta">
            {published
              ? 'Students can take this once the course is published too.'
              : 'Only you can see this. Add questions, then publish.'}
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
        <AssessmentForm initial={details} submitLabel="Save details" onSubmit={saveDetails} />
      </section>

      <section className="editor__section">
        <div className="editor__heading">
          <h2>Questions</h2>
          {editing !== 'new' && (
            <button type="button" className="button button--small" onClick={() => setEditing('new')}>
              Add question
            </button>
          )}
        </div>

        {attemptCount > 0 && (
          <p className="notice" role="note">
            Students have taken this {attemptCount} {attemptCount === 1 ? 'time' : 'times'}. Their scores stay as they
            were, but their review shows your latest wording.
          </p>
        )}

        {questions.length === 0 && editing !== 'new' && (
          <p className="loading">No questions yet. Add the first one.</p>
        )}

        <ol className="lesson-rows">
          {questions.map((question, index) => (
            <li key={question.id} className="question-row">
              {editing === question.id ? (
                <QuestionForm
                  key={question.id}
                  initial={question}
                  submitLabel="Save question"
                  onSubmit={(values) => saveQuestion(question.id, values)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <div className="question-row__head">
                    <span className="lesson-list__number" aria-hidden="true">
                      {question.position}
                    </span>
                    <span className="lesson-row__title">{question.prompt}</span>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        aria-label={`Move question ${question.position} up`}
                        disabled={index === 0}
                        onClick={() => void run(() => moveQuestion(question.id, 'up'))}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        aria-label={`Move question ${question.position} down`}
                        disabled={index === questions.length - 1}
                        onClick={() => void run(() => moveQuestion(question.id, 'down'))}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => setEditing(question.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button--danger button--small"
                        onClick={() => {
                          if (window.confirm(`Delete question ${question.position}?`)) {
                            void run(() => deleteQuestion(question.id))
                          }
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                  <ul className="question-row__options">
                    {question.options.map((option) => (
                      <li key={option.id} className={option.isCorrect ? 'is-correct' : undefined}>
                        {option.text}
                        {option.isCorrect && <span className="sr-only"> (correct answer)</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          ))}
        </ol>

        {editing === 'new' && (
          <div className="panel">
            <h3>New question</h3>
            <QuestionForm submitLabel="Add question" onSubmit={saveNewQuestion} onCancel={() => setEditing(null)} />
          </div>
        )}
      </section>

      <section className="editor__section">
        <h2>Delete assessment</h2>
        <p className="course-card__meta">
          This removes the assessment, all its questions, and every student's attempts. It can't be undone.
        </p>
        <button type="button" className="button button--danger" onClick={() => void removeAssessment()}>
          Delete this assessment
        </button>
      </section>
    </div>
  )
}
