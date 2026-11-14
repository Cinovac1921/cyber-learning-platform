import type { ClassroomDetail, ClassroomSummary } from '../types/classroom'
import { api } from './client'

export function listClassrooms(signal?: AbortSignal) {
  return api.get<ClassroomSummary[]>('/classrooms', { signal })
}

export function joinClassroom(code: string) {
  return api.post<{ id: number; name: string }>('/classrooms/join', { code })
}

export function getClassroom(id: number, signal?: AbortSignal) {
  return api.get<ClassroomDetail>(`/classrooms/${id}`, { signal })
}

export function leaveClassroom(id: number) {
  return api.delete<{ ok: boolean }>(`/classrooms/${id}/membership`)
}
