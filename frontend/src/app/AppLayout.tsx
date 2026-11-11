import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Brand } from '../components/Brand'
import { ChartIcon, HomeIcon, PlayIcon, TrophyIcon, WrenchIcon } from '../components/Icons'
import { useAuth } from '../features/auth/useAuth'
import { ThemeToggle } from './ThemeToggle'
import { useBackendStatus, type BackendStatus } from './useBackendStatus'

const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Checking server',
  online: 'Server connected',
  offline: 'Server unreachable',
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

export function AppLayout() {
  const backendStatus = useBackendStatus()
  const { user, logout } = useAuth()

  const navItems: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <HomeIcon size={20} />, end: true },
    { to: '/courses', label: 'Courses', icon: <PlayIcon size={18} /> },
    { to: '/challenges', label: 'Challenges', icon: <TrophyIcon size={20} /> },
    { to: '/assessments', label: 'Assessments', icon: <ChartIcon size={20} /> },
    ...(user?.role === 'INSTRUCTOR'
      ? [{ to: '/instructor', label: 'Instructor', icon: <WrenchIcon size={20} /> }]
      : []),
  ]

  return (
    <div className="app">
      <header className="topbar">
        <Brand />

        {user && (
          <nav aria-label="Main" className="topbar__nav">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="topbar__link">
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="topbar__tools">
          <ThemeToggle />
          {user && (
            <>
              <div className="topbar__profile">
                <span className="avatar" aria-hidden="true">
                  {user.displayName.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <p className="topbar__user">
                  {user.displayName}
                  <span>{user.role === 'INSTRUCTOR' ? 'Instructor' : 'Student'}</span>
                </p>
              </div>
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
