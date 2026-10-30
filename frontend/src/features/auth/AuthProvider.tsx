import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, loginAccount, registerAccount } from '../../api/auth'
import { ApiError, setAuthToken } from '../../api/client'
import type { AuthSession, RegisterInput, User } from '../../types/api'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

const TOKEN_KEY = 'cyberlearning.token'

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session just won't survive a refresh.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (readToken() ? 'loading' : 'signedOut'))

  // Restore the session after a page refresh.
  useEffect(() => {
    const token = readToken()
    if (!token) return

    setAuthToken(token)
    const controller = new AbortController()

    getCurrentUser(controller.signal)
      .then((currentUser) => {
        setUser(currentUser)
        setStatus('signedIn')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Only forget the token when the server says it's no longer valid,
        // not when the server is simply unreachable.
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
          saveToken(null)
          setAuthToken(null)
        }
        setStatus('signedOut')
      })

    return () => controller.abort()
  }, [])

  const startSession = useCallback((session: AuthSession) => {
    saveToken(session.accessToken)
    setAuthToken(session.accessToken)
    setUser(session.user)
    setStatus('signedIn')
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      startSession(await loginAccount({ email, password }))
    },
    [startSession],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      startSession(await registerAccount(input))
    },
    [startSession],
  )

  const logout = useCallback(() => {
    saveToken(null)
    setAuthToken(null)
    setUser(null)
    setStatus('signedOut')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}