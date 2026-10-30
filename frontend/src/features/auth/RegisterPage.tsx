import { useState, type SyntheticEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { useAuth } from './useAuth'

export function RegisterPage() {
  const { status, register } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'signedIn') {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setSubmitting(true)
    try {
      await register({
        displayName: String(data.get('displayName')).trim(),
        email: String(data.get('email')),
        password: String(data.get('password')),
      })
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
      <PageHeader title="Create an account" description="Sign up as a student to start learning." />
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Display name
          <input type="text" name="displayName" autoComplete="name" minLength={2} maxLength={60} required />
        </label>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" maxLength={254} required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
          />
          <span className="form__hint">At least 10 characters.</span>
        </label>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="form__alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}