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