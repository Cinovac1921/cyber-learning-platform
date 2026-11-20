import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Brand } from '../components/Brand'
import {
  ArrowLeftIcon,
  BookIcon,
  ChartIcon,
  HomeIcon,
  MenuIcon,
  ShieldIcon,
  TrophyIcon,
  WrenchIcon,
} from '../components/Icons'
import { canTeach, ROLE_LABEL } from '../features/auth/roles'
import { useAuth } from '../features/auth/useAuth'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { useBackendStatus, type BackendStatus } from './useBackendStatus'

const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Checking',
  online: 'Active',
  offline: 'Unreachable',
}

const COLLAPSE_KEY = 'sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

/** Wraps the signed-in pages. Pass children to use it outside the router's nested routes. */
export function AppLayout({ children }: { children?: ReactNode }) {
  const backendStatus = useBackendStatus()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  }

  const navItems: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <HomeIcon size={20} />, end: true },
    { to: '/courses', label: 'Courses', icon: <BookIcon size={20} /> },
    { to: '/challenges', label: 'Challenges', icon: <TrophyIcon size={20} /> },
    { to: '/assessments', label: 'Assessments', icon: <ChartIcon size={20} /> },
    ...(canTeach(user?.role)
      ? [{ to: '/instructor', label: 'Instructor', icon: <WrenchIcon size={20} /> }]
      : []),
    ...(user?.role === 'ADMIN' ? [{ to: '/admin', label: 'Admin', icon: <ShieldIcon size={20} /> }] : []),
  ]

  return (
    <div className={collapsed ? 'app is-collapsed' : 'app'}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={menuOpen ? 'sidebar is-open' : 'sidebar'}>
        <div className="sidebar__head">
          <Brand />
          {user && (
            <button
              type="button"
              className="sidebar__menu"
              aria-expanded={menuOpen}
              aria-controls="sidebar-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          )}
        </div>

        {user && (
          <>
            <nav id="sidebar-nav" aria-label="Main" className="sidebar__nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="sidebar__link"
                  title={item.label}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="sidebar__foot">
              <button type="button" className="sidebar__logout" title="Log out" onClick={logout}>
                <ArrowLeftIcon size={20} />
                <span>Log out</span>
              </button>
            </div>
          </>
        )}
      </aside>

      <div className="workspace">
        <div className="topstrip">
          <div className="topstrip__lead">
            {user && (
              <button
                type="button"
                className="icon-toggle"
                aria-label={collapsed ? 'Show the menu labels' : 'Hide the menu labels'}
                aria-expanded={!collapsed}
                aria-controls="sidebar-nav"
                onClick={toggleCollapsed}
              >
                <MenuIcon size={20} />
              </button>
            )}
            <p className={`status status--${backendStatus}`} role="status">
              <span className="status__dot" aria-hidden="true" />
              System status / {STATUS_LABEL[backendStatus]}
            </p>
          </div>

          <div className="topstrip__tools">
            <ThemeToggle />
            {user && (
              <>
                <NotificationBell />
                <div className="topbar__profile">
                  <span className="avatar" aria-hidden="true">
                    {initials(user.displayName)}
                  </span>
                  <p className="topbar__user">
                    {user.displayName}
                    <span>{ROLE_LABEL[user.role]}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <main id="main" className="content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return letters || '?'
}
