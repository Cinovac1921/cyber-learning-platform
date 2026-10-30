import { createContext } from 'react'
import type { RegisterInput, User } from '../../types/api'

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)