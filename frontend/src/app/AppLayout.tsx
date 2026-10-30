import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import { ThemeToggle } from './ThemeToggle'
import { useBackendStatus, type BackendStatus } from './useBackendStatus'

const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Checking server',
  online: 'Server connected',
  offline: 'Server unreachable',
}

export function AppLayout() {
  const backendStatus = useBackendStatus()
  const { user, logout } = useAuth()

  const navItems = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/courses', label: 'Courses' },
    { to: '/challenges', label: 'Challenges' },
    { to: '/assessments', label: 'Assessments' },
    ...(user?.role === 'INSTRUCTOR' ? [{ to: '/instructor', label: 'Instructor' }] : []),
  ]

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="topbar__brand">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M15 2l11 6.5v13L15 28 4 21.5v-13z" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M10 15l3.5 3.5L20 12" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>Cyber Learning</span>
        </NavLink>

        {user && (
          <nav aria-label="Main" className="topbar__nav">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="topbar__link">
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="topbar__tools">
          <ThemeToggle />
          {user && (
            <>
              <p className="topbar__user">
                {user.displayName}
                <span>{user.role === 'INSTRUCTOR' ? 'Instructor' : 'Student'}</span>
              </p>
              <button type="button" className="button button--quiet button--small" onClick={logout}>
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="footer">
        <p className={`status status--${backendStatus}`} role="status">
          <span className="status__dot" aria-hidden="true" />
          {STATUS_LABEL[backendStatus]}
        </p>
      </footer>
    </div>
  )
}