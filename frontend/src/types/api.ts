export interface HealthResponse {
  status: 'ok'
  timestamp: string
}

export type Role = 'STUDENT' | 'INSTRUCTOR'

export interface User {
  id: number
  email: string
  displayName: string
  role: Role
}

export interface AuthSession {
  accessToken: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  displayName: string
}