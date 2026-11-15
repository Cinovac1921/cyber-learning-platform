import { useEffect, useState, type SyntheticEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { checkResetLink, resetPassword } from '../../api/auth'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Keep the token in memory and take it out of the address bar, so it doesn't linger in the
  // browser history or get copied along with the URL.
  const [token] = useState(() => params.get('token'))
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params.has('token')) navigate('/reset-password', { replace: true })
  }, [params, navigate])

  // Ask the server whether the link still works, so a used or expired one says so straight away
  // instead of showing a form that can only fail. If the check itself can't be made, show the form anyway.
  const [link, setLink] = useState<'checking' | 'usable' | 'dead'>(token ? 'checking' : 'dead')
  useEffect(() => {
    if (!token) return
    let cancelled = false
    checkResetLink(token)
      .then((result) => {
        if (!cancelled) setLink(result.valid ? 'usable' : 'dead')
      })
      .catch(() => {
        if (!cancelled) setLink('usable')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (done) {
    return (
      <div className="auth-card">
        <PageHeader title="Password changed" description="You can sign in with your new password now." />
        <Link to="/login" className="button">
          Sign in
        </Link>
      </div>
    )
  }

  if (link === 'checking') {
    return (
      <div className="auth-card">
        <p className="loading" role="status">
          Checking your link…
        </p>
      </div>
    )
  }

  if (link === 'dead' || !token) {
    return (
      <div className="auth-card">
        <PageHeader
          title="This link doesn't work"
          description="It has expired, was already used, or is incomplete. Links work once, for 30 minutes."
        />
        <p className="form__alt">
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </div>
    )
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password'))
    if (password !== String(data.get('confirm'))) {
      setError("The two passwords don't match.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      setDone(true)
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

  return (
    <div className="auth-card">
      <PageHeader title="Choose a new password" description="Pick something you don't use anywhere else." />
      <form className="form" onSubmit={handleSubmit}>
        <label>
          New password
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
        <label>
          Type it again
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
          />
        </label>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}{' '}
            {error.includes('invalid or has expired') && <Link to="/forgot-password">Request a new link</Link>}
          </p>
        )}
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}
