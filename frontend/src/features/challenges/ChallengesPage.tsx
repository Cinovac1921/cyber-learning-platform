import { useState } from 'react'
import { Link } from 'react-router'
import { listChallenges } from '../../api/challenges'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { CheckIcon, TrophyIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import type { ChallengeCategory } from '../../types/challenges'
import { DifficultyChip } from './DifficultyChip'
import { CATEGORIES, categoryLabel } from './meta'

export function ChallengesPage() {
  const challenges = useResource('challenges', (signal) => listChallenges(signal))
  const [filter, setFilter] = useState<ChallengeCategory | 'ALL'>('ALL')

  return (
    <>
      <PageHeader
        eyebrow="Laboratories"
        title="Challenges"
        description="Hands-on problems you solve to earn points. Find the flag and submit it."
        actions={
          <Link to="/challenges/leaderboard" className="button button--quiet">
            <TrophyIcon size={18} />
            Leaderboard
          </Link>
        }
      />

      {challenges.status === 'loading' && (
        <p className="loading" role="status">
          Loading challenges…
        </p>
      )}

      {challenges.status === 'error' && <ErrorNotice error={challenges.error} />}

      {challenges.status === 'ready' && challenges.data.length === 0 && (
        <EmptyState title="No challenges yet">
          Challenges appear here once an instructor publishes them.
        </EmptyState>
      )}

      {challenges.status === 'ready' && challenges.data.length > 0 && (
        <>
          <p className="score-line">
            {challenges.data.filter((item) => item.solved).length} of {challenges.data.length} solved,{' '}
            {challenges.data.filter((item) => item.solved).reduce((total, item) => total + item.points, 0)} points
          </p>

          <div className="filter-bar" role="group" aria-label="Filter by category">
            {[{ value: 'ALL' as const, label: 'All' }, ...CATEGORIES].map((category) => (
              <button
                key={category.value}
                type="button"
                className="filter-chip"
                aria-pressed={filter === category.value}
                onClick={() => setFilter(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="course-grid">
            {challenges.data
              .filter((item) => filter === 'ALL' || item.category === filter)
              .map((challenge) => (
                <article key={challenge.id} className="course-card">
                  <div className="course-card__head">
                    <span className="label">Lab / {String(challenges.data.indexOf(challenge) + 1).padStart(3, '0')}</span>
                    <span className="chip">{categoryLabel(challenge.category)}</span>
                  </div>
                  <h3>{challenge.title}</h3>
                  <div className="toolbar">
                    <DifficultyChip difficulty={challenge.difficulty} />
                    <span className="chip">{challenge.points} pts</span>
                    {challenge.hasFile && <span className="chip">File</span>}
                  </div>
                  <p className={challenge.solved ? 'score-line score-line--passed' : 'score-line'}>
                    {challenge.solved && <CheckIcon size={16} />}
                    {challenge.solved
                      ? 'Solved'
                      : `${challenge.solveCount} ${challenge.solveCount === 1 ? 'solve' : 'solves'}`}
                  </p>
                  <Link to={`/challenges/${challenge.id}`} className="button button--block">
                    {challenge.solved ? 'View' : 'Open'}
                  </Link>
                </article>
              ))}
          </div>
        </>
      )}
    </>
  )
}
