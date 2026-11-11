import { Link } from 'react-router'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '../../components/Icons'

interface LessonActionsProps {
  completed: boolean
  saving: boolean
  courseHref: string
  previousHref: string | null
  nextHref: string | null
  onComplete: () => void
  onCompleteAndContinue: () => void
  onUndo: () => void
}

export function LessonActions({
  completed,
  saving,
  courseHref,
  previousHref,
  nextHref,
  onComplete,
  onCompleteAndContinue,
  onUndo,
}: LessonActionsProps) {
  return (
    <div className="lesson-actions">
      {previousHref ? (
        <Link to={previousHref} className="button button--quiet">
          <ArrowLeftIcon size={18} />
          Previous
        </Link>
      ) : (
        <span />
      )}

      <div className="lesson-actions__main">
        {completed ? (
          <>
            <button type="button" className="button button--quiet" disabled={saving} onClick={onUndo}>
              <CheckIcon size={18} />
              Completed · Undo
            </button>
            <Link to={nextHref ?? courseHref} className="button">
              {nextHref ? 'Next lesson' : 'Back to course'}
              {nextHref && <ArrowRightIcon size={18} />}
            </Link>
          </>
        ) : (
          <>
            <button type="button" className="button button--quiet" disabled={saving} onClick={onComplete}>
              Mark complete
            </button>
            <button type="button" className="button" disabled={saving} onClick={onCompleteAndContinue}>
              {nextHref ? 'Complete and continue' : 'Finish course'}
              {nextHref && <ArrowRightIcon size={18} />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
