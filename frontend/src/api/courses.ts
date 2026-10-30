import type { CourseDetail, CourseSummary, LessonDetail } from '../types/learning'
import { api } from './client'

export function listCourses(signal?: AbortSignal) {
  return api.get<CourseSummary[]>('/courses', { signal })
}

export function getCourse(slug: string, signal?: AbortSignal) {
  return api.get<CourseDetail>(`/courses/${encodeURIComponent(slug)}`, { signal })
}

export function getLesson(slug: string, position: number, signal?: AbortSignal) {
  return api.get<LessonDetail>(`/courses/${encodeURIComponent(slug)}/lessons/${position}`, { signal })
}