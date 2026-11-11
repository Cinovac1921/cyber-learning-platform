import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { getAttempt } from '../../api/assessments'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { ArrowLeftIcon, CheckIcon, CloseIcon } from '../../components/Icons'
import { ProgressRing } from '../dashboard/ProgressRing'

export function AssessmentResultPage() {
  const { id = '', attemptId = '' } = useParams()
  const assessmentId = Number(id)
  const attemptNumber = Number(attemptId)

  const result = useResource(`attempt:${id}:${attemptId}`, (signal) =>
    Number.isInteger(assessmentId) && assessmentId > 0 && Number.isInteger(attemptNumber) && attemptNumber > 0
      ? getAttempt(assessmentId, attemptNumber, signal)
      : Promise.reject(new ApiError(404, 'Result not found.', null)),
  )

  if (result.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading your result…
      </p>
    )
  }

  if (result.status === 'error') {
    return <ErrorNotice error={result.error} />
  }

  const { correct, total, percent, passed, assessment, review } = result.data

  return (
    <div className="result">
      <p className="breadcrumb">
        <Link to="/assessments">
          <ArrowLeftIcon size={20} />
          Assessments
        </Link>
      </p>

      <section className="panel result__hero" aria-labelledby="result-heading">
        <ProgressRing percent={percent} color={passed ? 'var(--ok)' : 'var(--warn)'} size={168} thickness={9} />
        <div className="result__summary">
          <p className="result__quiz">{assessment.title}</p>
          <h1 id="result-heading">{passed ? 'You passed' : 'Not passed yet'}</h1>
          <p className="result__text">
            You got {correct} of {total} right. The pass mark is {assessment.passPercent}%.
          </p>
          <div className="toolbar">
            <Link to={`/assessments/${assessment.id}`} className="button">
              Retake
            </Link>
            <Link to={`/courses/${assessment.course.slug}`} className="button button--quiet">
              Back to course
            </Link>
          </div>
        </div>
      </section>

      <h2 className="result__heading">Your answers</h2>
      <ol className="review-list">
        {review.map((question) => (
          <li key={question.id} className={question.isCorrect ? 'review-card is-right' : 'review-card is-wrong'}>
            <p className="review-card__status">
              <span className="review-card__icon" aria-hidden="true">
                {question.isCorrect ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
              </span>
              Question {question.position}: {question.isCorrect ? 'correct' : 'incorrect'}
            </p>
            <h3 className="review-card__prompt">{question.prompt}</h3>
            <ul className="review-options">
              {question.options.map((option) => {
                const isCorrectOption = option.id === question.correctOptionId
                const isPicked = option.id === question.selectedOptionId
                const className = isCorrectOption
                  ? 'review-option is-correct'
                  : isPicked
                    ? 'review-option is-picked'
                    : 'review-option'
                return (
                  <li key={option.id} className={className}>
                    <span>{option.text}</span>
                    {isCorrectOption && <span className="review-option__tag">Correct answer</span>}
                    {isPicked && !isCorrectOption && <span className="review-option__tag">Your answer</span>}
                  </li>
                )
              })}
            </ul>
            {question.explanation && <p className="review-card__why">{question.explanation}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}
