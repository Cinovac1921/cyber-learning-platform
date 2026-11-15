import type { NotificationList } from '../types/notification'
import { api } from './client'

export function listNotifications(signal?: AbortSignal) {
  return api.get<NotificationList>('/notifications', { signal })
}

export function markAllNotificationsRead() {
  return api.post<{ ok: boolean }>('/notifications/read-all')
}

export function markNotificationRead(id: number) {
  return api.post<{ ok: boolean }>(`/notifications/${id}/read`)
}
