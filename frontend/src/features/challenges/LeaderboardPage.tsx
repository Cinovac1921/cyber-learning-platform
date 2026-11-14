import { Link } from 'react-router'
import { getLeaderboard } from '../../api/challenges'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { LeaderboardRow } from '../../types/challenges'

function Row({ row, mine }: { row: LeaderboardRow; mine: boolean }) {
  return (
    <tr className={mine ? 'is-me' : undefined}>
      <td>{row.rank}</td>
      <td>
        {row.displayName}
        {mine && <span className="chip chip--live">You</span>}
      </td>
      <td className="num">{row.solves}</td>
      <td className="num">{row.points}</td>
    </tr>
  )
}

export function LeaderboardPage() {
  const board = useResource('leaderboard', (signal) => getLeaderboard(signal))

  return (
    <>
      <p className="breadcrumb">
        <Link to="/challenges">All challenges</Link>
      </p>
      <PageHeader title="Leaderboard" description="Students ranked by points from solved challenges." />

      {board.status === 'loading' && (
        <p className="loading" role="status">
          Loading leaderboard…
        </p>
      )}

      {board.status === 'error' && <ErrorNotice error={board.error} />}

      {board.status === 'ready' && board.data.top.length === 0 && (
        <EmptyState title="Nobody has scored yet">Solve a challenge to be the first on the board.</EmptyState>
      )}

      {board.status === 'ready' && board.data.top.length > 0 && (
        <div className="table-wrap">
          <table className="leaderboard">
            <caption className="sr-only">Leaderboard</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Student</th>
                <th scope="col" className="num">
                  Solves
                </th>
                <th scope="col" className="num">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {board.data.top.map((row) => (
                <Row key={row.rank} row={row} mine={board.data.me?.rank === row.rank} />
              ))}
              {board.data.me && board.data.me.rank > board.data.top.length && (
                <>
                  <tr className="gap" aria-hidden="true">
                    <td colSpan={4}>…</td>
                  </tr>
                  <Row row={board.data.me} mine />
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
