import { Outlet } from 'react-router'
import { Brand, HeroArt } from '../components/Brand'
import { ThemeToggle } from './ThemeToggle'
import { useBackendStatus, type BackendStatus } from './useBackendStatus'

const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Checking',
  online: 'Active',
  offline: 'Unreachable',
}

export function AuthLayout() {
  const backendStatus = useBackendStatus()

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <Brand />

        <div className="auth-brand__pitch">
          <span className="label">Cybersecurity learning platform</span>
          <h2>
            Learn security
            <br />
            by doing.
          </h2>
          <p>Courses, hands-on challenges and quizzes in one place.</p>
        </div>

        <HeroArt className="auth-brand__art" />

        <p className={`status status--${backendStatus}`} role="status">
          <span className="status__dot" aria-hidden="true" />
          System status / {STATUS_LABEL[backendStatus]}
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
