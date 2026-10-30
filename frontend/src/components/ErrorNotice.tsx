import { Link } from 'react-router'
import { ApiError } from '../api/client'
import { EmptyState } from './EmptyState'

export function ErrorNotice({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="We couldn't find that"
        action={
          <Link to="/courses" className="button">
            Back to courses
          </Link>
        }
      >
        It may have been removed, or the link is wrong.
      </EmptyState>
    )
  }

  return (
    <p className="notice notice--error" role="alert">
      Something went wrong while loading this page. Check that the server is running and try again.
    </p>
  )
}