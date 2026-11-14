import { useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { requestPasswordReset } from '../../api/auth'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'

export function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email')).trim()
    setError(null)
    setSubmitting(true)
    try {
      const result = await requestPasswordReset(email)
      setMessage(result.message)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many tries. Wait a minute, then try again.')
      } else {
        setError(
          err instanceof ApiError ? err.message : "Can't reach the server. Check that the backend is running.",
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (message) {
    return (
      <div className="auth-card">
        <PageHeader title="Check your email" description={message} />
        <p className="form__alt">
          Nothing arrived? Check your spam folder, or{' '}
          <button type="button" className="link-button" onClick={() => setMessage(null)}>
            ask for another link
          </button>{' '}
          in a minute.
        </p>
        <p className="form__alt">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <PageHeader
        title="Forgot your password?"
        description="Enter your email and we'll send you a link to choose a new one."
      />
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" maxLength={254} required />
        </label>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="form__alt">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}
