import type {
  ClassroomInput,
  InstructorClassroom,
  InstructorClassroomSummary,
} from '../types/classroom'
import { api } from './client'

type Ok = { ok: boolean }

export function listMyClassrooms(signal?: AbortSignal) {
  return api.get<InstructorClassroomSummary[]>('/instructor/classrooms', { signal })
}

export function getMyClassroom(id: number, signal?: AbortSignal) {
  return api.get<InstructorClassroom>(`/instructor/classrooms/${id}`, { signal })
}

export function createClassroom(input: ClassroomInput) {
  return api.post<{ id: number }>('/instructor/classrooms', input)
}

export function updateClassroom(id: number, changes: Partial<ClassroomInput> & { joinOpen?: boolean }) {
  return api.patch<Ok>(`/instructor/classrooms/${id}`, changes)
}

export function regenerateJoinCode(id: number) {
  return api.post<{ joinCode: string }>(`/instructor/classrooms/${id}/join-code`)
}

export function removeMember(classroomId: number, userId: number) {
  return api.delete<Ok>(`/instructor/classrooms/${classroomId}/members/${userId}`)
}

export function deleteClassroom(id: number) {
  return api.delete<Ok>(`/instructor/classrooms/${id}`)
}
