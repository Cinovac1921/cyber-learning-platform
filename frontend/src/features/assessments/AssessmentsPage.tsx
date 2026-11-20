import { Link } from 'react-router'
import { listAssessments } from '../../api/assessments'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { CheckIcon, ListIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'

export function AssessmentsPage() {
  const assessments = useResource('assessments', (signal) => listAssessments(signal))

  return (
    <>
      <PageHeader eyebrow="Examinations" title="Assessments" description="Quizzes and tests that check what you've learned." />

      {assessments.status === 'loading' && (
        <p className="loading" role="status">
          Loading assessments…
        </p>
      )}

      {assessments.status === 'error' && <ErrorNotice error={assessments.error} />}

      {assessments.status === 'ready' && assessments.data.length === 0 && (
        <EmptyState title="No assessments yet">
          Assessments appear here once an instructor publishes them for a course.
        </EmptyState>
      )}

      {assessments.status === 'ready' && assessments.data.length > 0 && (
        <div className="course-grid">
          {assessments.data.map((assessment, index) => (
            <article key={assessment.id} className="course-card">
              <div className="course-card__head">
                <span className="label">Assessment / {String(index + 1).padStart(2, '0')}</span>
                <Link to={`/courses/${assessment.course.slug}`} className="chip">
                  {assessment.course.title}
                </Link>
              </div>
              <h3>{assessment.title}</h3>
              {assessment.description && <p className="course-card__summary">{assessment.description}</p>}
              <div className="toolbar">
                <span className="chip">
                  <ListIcon size={16} />
                  {assessment.questionCount} {assessment.questionCount === 1 ? 'question' : 'questions'}
                </span>
                <span className="chip">Pass at {assessment.passPercent}%</span>
              </div>
              {assessment.bestPercent !== null && (
                <p className={assessment.passed ? 'score-line score-line--passed' : 'score-line'}>
                  {assessment.passed && <CheckIcon size={16} />}
                  Best score {assessment.bestPercent}%
                  {assessment.passed ? ', passed' : ', not passed yet'}
                </p>
              )}
              <Link to={`/assessments/${assessment.id}`} className="button button--block">
                {assessment.tries === 0 ? 'Start' : 'Retake'}
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
