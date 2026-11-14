import { Navigate, Outlet, useLocation } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { Role } from '../../types/api'
import { useAuth } from './useAuth'

export function RequireAuth({ role }: { role?: Role | Role[] }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <p className="loading" role="status">
        Checking your session…
      </p>
    )
  }

  if (status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const allowed = role === undefined ? null : Array.isArray(role) ? role : [role]
  if (allowed && (!user || !allowed.includes(user.role))) {
    return (
      <>
        <PageHeader title="Access restricted" />
        <EmptyState title="You don't have access to this page">
          This area needs a different role. If you should have access, ask an administrator to
          change your role.
        </EmptyState>
      </>
    )
  }

  return <Outlet />
}