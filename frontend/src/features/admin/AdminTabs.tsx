import { NavLink } from 'react-router'
import { getPendingReviewCount } from '../../api/admin'
import { useResource } from '../../app/useResource'

/** Moves between the admin pages, and shows how many courses are waiting for review. */
export function AdminTabs() {
  const pending = useResource('admin-pending-count', (signal) => getPendingReviewCount(signal))
  const waiting = pending.status === 'ready' ? pending.data.pending : 0

  return (
    <nav className="subnav" aria-label="Admin sections">
      <NavLink to="/admin" end>
        Users
      </NavLink>
      <NavLink to="/admin/reviews">
        Review queue
        {waiting > 0 && (
          <>
            <span className="chip chip--live" aria-hidden="true">
              {waiting}
            </span>
            <span className="sr-only"> ({waiting} waiting)</span>
          </>
        )}
      </NavLink>
    </nav>
  )
}
