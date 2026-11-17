import type { LibraryDetail, LibraryList } from '../types/library'
import { api } from './client'

export function listLibrary(signal?: AbortSignal) {
  return api.get<LibraryList>('/instructor/library', { signal })
}

export function getLibraryCourse(courseId: number, signal?: AbortSignal) {
  return api.get<LibraryDetail>(`/instructor/library/${courseId}`, { signal })
}

/** Copies a lesson into one of your courses. It arrives hidden. */
export function copyLesson(targetCourseId: number, lessonId: number) {
  return api.post<{ id: number; position: number }>(`/instructor/courses/${targetCourseId}/copy-lesson`, { lessonId })
}

/** Copies a template quiz into one of your classroom courses. It arrives unpublished. */
export function copyAssessment(targetCourseId: number, assessmentId: number) {
  return api.post<{ id: number }>(`/instructor/courses/${targetCourseId}/copy-assessment`, { assessmentId })
}

/** Makes a new classroom course from a library course. */
export function copyCourse(classroomId: number, courseId: number) {
  return api.post<{ id: number }>(`/instructor/classrooms/${classroomId}/copy-course`, { courseId })
}
