import { Link } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="This address doesn't lead anywhere"
        action={
          <Link to="/" className="button">
            Go to dashboard
          </Link>
        }
      >
        Check the link for typos, or head back to the dashboard.
      </EmptyState>
    </>
  )
}