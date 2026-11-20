import { AppLayout } from '../../app/AppLayout'
import { useAuth } from '../auth/useAuth'
import { DashboardPage } from '../dashboard/DashboardPage'
import { LandingPage } from './LandingPage'

/**
 * The page at "/". Visitors who are not signed in see the public home page;
 * signed-in people go straight to their dashboard, inside the usual layout.
 */
export function HomeGate() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <p className="loading landing__loading" role="status">
        Checking your session…
      </p>
    )
  }

  if (status === 'signedOut') {
    return <LandingPage />
  }

  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  )
}
