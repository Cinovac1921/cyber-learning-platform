import type { AdminUser } from '../types/admin'
import type { Role } from '../types/api'
import { api } from './client'

export function listUsers(search: string, signal?: AbortSignal) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return api.get<AdminUser[]>(`/admin/users${query}`, { signal })
}

export function changeUserRole(userId: number, role: Role) {
  return api.patch<AdminUser>(`/admin/users/${userId}/role`, { role })
}
