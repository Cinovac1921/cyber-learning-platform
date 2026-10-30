import { useState, type SyntheticEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'signedIn') {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setSubmitting(true)
    try {
      await login(String(data.get('email')), String(data.get('password')))
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Can't reach the server. Check that the backend is running.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-card">
      <PageHeader title="Sign in" description="Use your account to save progress and submit answers." />
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="form__alt">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}