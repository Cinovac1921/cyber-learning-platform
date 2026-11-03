import type {
  CourseInput,
  InstructorCourse,
  InstructorCourseSummary,
  LessonInput,
} from '../types/instructor'
import { api } from './client'

type Ok = { ok: boolean }

export function listMyCourses(signal?: AbortSignal) {
  return api.get<InstructorCourseSummary[]>('/instructor/courses', { signal })
}

export function getMyCourse(id: number, signal?: AbortSignal) {
  return api.get<InstructorCourse>(`/instructor/courses/${id}`, { signal })
}

export function createCourse(input: CourseInput) {
  return api.post<{ id: number; slug: string }>('/instructor/courses', input)
}

export function updateCourse(id: number, changes: Partial<CourseInput> & { published?: boolean }) {
  return api.patch<Ok>(`/instructor/courses/${id}`, changes)
}

export function deleteCourse(id: number) {
  return api.delete<Ok>(`/instructor/courses/${id}`)
}

export function createLesson(courseId: number, input: LessonInput) {
  return api.post<{ id: number; position: number }>(`/instructor/courses/${courseId}/lessons`, input)
}

export function updateLesson(lessonId: number, changes: Partial<LessonInput>) {
  return api.patch<Ok>(`/instructor/lessons/${lessonId}`, changes)
}

export function deleteLesson(lessonId: number) {
  return api.delete<Ok>(`/instructor/lessons/${lessonId}`)
}

export function moveLesson(lessonId: number, direction: 'up' | 'down') {
  return api.post<Ok>(`/instructor/lessons/${lessonId}/move`, { direction })
}