import { Link } from 'react-router'
import { listMyChallenges } from '../../api/challenges'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { DifficultyChip } from '../challenges/DifficultyChip'
import { categoryLabel } from '../challenges/meta'

export function InstructorChallengesPage() {
  const challenges = useResource('instructor-challenges', (signal) => listMyChallenges(signal))

  return (
    <>
      <p className="breadcrumb">
        <Link to="/instructor">Instructor</Link>
      </p>
      <PageHeader
        title="Challenges"
        description="Create capture-the-flag challenges. Students only see the ones you publish."
        actions={
          <Link to="/instructor/challenges/new" className="button">
            + New challenge
          </Link>
        }
      />

      {challenges.status === 'loading' && (
        <p className="loading" role="status">
          Loading your challenges…
        </p>
      )}

      {challenges.status === 'error' && <ErrorNotice error={challenges.error} />}

      {challenges.status === 'ready' && challenges.data.length === 0 && (
        <EmptyState
          title="You haven't created a challenge yet"
          action={
            <Link to="/instructor/challenges/new" className="button">
              Create your first challenge
            </Link>
          }
        >
          New challenges start as drafts. Add the flag and any file, then publish.
        </EmptyState>
      )}

      {challenges.status === 'ready' && challenges.data.length > 0 && (
        <ul className="lesson-rows">
          {challenges.data.map((challenge) => (
            <li key={challenge.id} className="lesson-row challenge-row">
              <span className="lesson-row__title">{challenge.title}</span>
              <span className="toolbar">
                <span className={challenge.published ? 'chip chip--live' : 'chip'}>
                  {challenge.published ? 'Published' : 'Draft'}
                </span>
                <span className="chip">{categoryLabel(challenge.category)}</span>
                <DifficultyChip difficulty={challenge.difficulty} />
                <span className="chip">{challenge.points} pts</span>
                {challenge.hasFile && <span className="chip">File</span>}
                <span className="course-card__meta">
                  {challenge.solveCount} {challenge.solveCount === 1 ? 'solve' : 'solves'}
                </span>
              </span>
              <Link to={`/instructor/challenges/${challenge.id}`} className="button button--quiet button--small">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
