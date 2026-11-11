import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { getAssessment, submitAttempt } from '../../api/assessments'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '../../components/Icons'

export function AssessmentPage() {
  const { id = '' } = useParams()
  const assessmentId = Number(id)
  const navigate = useNavigate()

  const quiz = useResource(`assessment:${id}`, (signal) =>
    Number.isInteger(assessmentId) && assessmentId > 0
      ? getAssessment(assessmentId, signal)
      : Promise.reject(new ApiError(404, 'Assessment not found.', null)),
  )

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Moves keyboard focus to the new question after Next or Back.
  const promptRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    promptRef.current?.focus()
  }, [index])

  if (quiz.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading assessment…
      </p>
    )
  }

  if (quiz.status === 'error') {
    return <ErrorNotice error={quiz.error} />
  }

  const { title, course, questions, passPercent, bestPercent } = quiz.data
  const question = questions[index]
  const isLast = index === questions.length - 1
  const answeredCount = questions.filter((item) => answers[item.id] !== undefined).length
  const allAnswered = answeredCount === questions.length

  async function submit() {
    setError(null)
    setSubmitting(true)
    try {
      const result = await submitAttempt(
        assessmentId,
        questions.map((item) => ({ questionId: item.id, optionId: answers[item.id] })),
      )
      navigate(`/assessments/${assessmentId}/results/${result.id}`)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Can't reach the server. Your answers are still here, so try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="quiz">
      <div className="quiz__top">
        <Link to="/assessments" className="quiz__back">
          <ArrowLeftIcon size={18} />
          Assessments
        </Link>
        <span>{course.title}</span>
      </div>

      <h1 className="quiz__title">{title}</h1>
      <p className="quiz__meta">
        Question {index + 1} of {questions.length}. Pass at {passPercent}%
        {bestPercent !== null && `. Your best so far is ${bestPercent}%`}.
      </p>

      <ol className="quiz-steps" aria-label="Questions">
        {questions.map((item, position) => (
          <li key={item.id}>
            <button
              type="button"
              className={
                position === index
                  ? 'quiz-steps__item is-current'
                  : answers[item.id] !== undefined
                    ? 'quiz-steps__item is-done'
                    : 'quiz-steps__item'
              }
              aria-label={`Question ${position + 1}${answers[item.id] !== undefined ? ' (answered)' : ''}`}
              aria-current={position === index ? 'step' : undefined}
              onClick={() => setIndex(position)}
            />
          </li>
        ))}
      </ol>

      <fieldset key={question.id} className="quiz__card">
        <legend className="sr-only">Question {index + 1}</legend>
        <h2 className="quiz__prompt" ref={promptRef} tabIndex={-1}>
          {question.prompt}
        </h2>
        <div className="choices">
          {question.options.map((option) => {
            const selected = answers[question.id] === option.id
            return (
              <label key={option.id} className={selected ? 'choice is-selected' : 'choice'}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={selected}
                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                />
                <span className="choice__mark" aria-hidden="true">
                  {selected && <CheckIcon size={14} />}
                </span>
                <span>{option.text}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      <div className="quiz__actions">
        <button
          type="button"
          className="button button--quiet"
          disabled={index === 0 || submitting}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeftIcon size={18} />
          Back
        </button>

        {isLast ? (
          <button type="button" className="button" disabled={!allAnswered || submitting} onClick={() => void submit()}>
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
        ) : (
          <button
            type="button"
            className="button"
            disabled={answers[question.id] === undefined}
            onClick={() => setIndex(index + 1)}
          >
            Next
            <ArrowRightIcon size={18} />
          </button>
        )}
      </div>

      {isLast && !allAnswered && (
        <p className="quiz__hint" role="status">
          {questions.length - answeredCount} {questions.length - answeredCount === 1 ? 'question is' : 'questions are'}{' '}
          still unanswered. Use the bars above to jump back to them.
        </p>
      )}
    </article>
  )
}
