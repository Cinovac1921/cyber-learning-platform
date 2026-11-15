import type { AdminUser } from '../types/admin'
import type { ReviewDetail, ReviewList } from '../types/review'
import type { Role } from '../types/api'
import { api } from './client'

export function listUsers(search: string, signal?: AbortSignal) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return api.get<AdminUser[]>(`/admin/users${query}`, { signal })
}

export function changeUserRole(userId: number, role: Role) {
  return api.patch<AdminUser>(`/admin/users/${userId}/role`, { role })
}

export function listReviews(signal?: AbortSignal) {
  return api.get<ReviewList>('/admin/reviews', { signal })
}

export function getReview(courseId: number, signal?: AbortSignal) {
  return api.get<ReviewDetail>(`/admin/reviews/${courseId}`, { signal })
}

export function approveReview(courseId: number) {
  return api.post<{ ok: boolean }>(`/admin/reviews/${courseId}/approve`)
}

export function rejectReview(courseId: number, note: string) {
  return api.post<{ ok: boolean }>(`/admin/reviews/${courseId}/reject`, { note })
}

export function takedownCourse(courseId: number, note: string) {
  return api.post<{ ok: boolean }>(`/admin/reviews/${courseId}/takedown`, { note })
}
