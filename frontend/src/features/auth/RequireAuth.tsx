import { Navigate, Outlet, useLocation } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { Role } from '../../types/api'
import { useAuth } from './useAuth'

export function RequireAuth({ role }: { role?: Role }) {
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

  if (role && user?.role !== role) {
    return (
      <>
        <PageHeader title="Access restricted" />
        <EmptyState title="You don't have access to this page">
          This area is for instructors. If you should have access, ask an administrator to change
          your role.
        </EmptyState>
      </>
    )
  }

  return <Outlet />
}