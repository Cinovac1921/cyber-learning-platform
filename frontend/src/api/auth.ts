import type { AuthSession, LoginInput, RegisterInput, User } from '../types/api'
import { api } from './client'

export function registerAccount(input: RegisterInput) {
  return api.post<AuthSession>('/auth/register', input)
}

export function loginAccount(input: LoginInput) {
  return api.post<AuthSession>('/auth/login', input)
}

export function getCurrentUser(signal?: AbortSignal) {
  return api.get<User>('/auth/me', { signal })
}

/** Asks for a reset link. The answer is the same whether or not an account uses the email. */
export function requestPasswordReset(email: string) {
  return api.post<{ message: string }>('/auth/forgot-password', { email })
}

export function resetPassword(token: string, password: string) {
  return api.post<{ message: string }>('/auth/reset-password', { token, password })
}

/** Whether a reset link can still be used, so the page can say so before asking for a password. */
export function checkResetLink(token: string) {
  return api.post<{ valid: boolean }>('/auth/reset-password/check', { token })
}
