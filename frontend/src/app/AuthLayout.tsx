import { Link, Outlet } from 'react-router'
import { ThemeToggle } from './ThemeToggle'
import { useBackendStatus, type BackendStatus } from './useBackendStatus'

const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Checking server',
  online: 'Server connected',
  offline: 'Server unreachable',
}

export function AuthLayout() {
  const backendStatus = useBackendStatus()

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <Link to="/" className="topbar__brand">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M15 2l11 6.5v13L15 28 4 21.5v-13z" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M10 15l3.5 3.5L20 12" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>Cyber Learning</span>
        </Link>

        <div className="auth-brand__pitch">
          <h2>
            Learn security
            <br />
            by doing.
          </h2>
          <p>Courses, hands-on challenges and quizzes in one place.</p>
        </div>

        <p className={`status status--${backendStatus}`} role="status">
          <span className="status__dot" aria-hidden="true" />
          {STATUS_LABEL[backendStatus]}
        </p>
      </section>

      <main className="auth-main">
        <div className="auth-main__tools">
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  )
}