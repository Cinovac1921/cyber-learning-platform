import type { Role } from './api'

export interface AdminUser {
  id: number
  email: string
  displayName: string
  role: Role
  createdAt: string
}
