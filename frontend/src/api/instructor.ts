import type {
  AssessmentInput,
  CourseInput,
  CourseScope,
  InstructorAssessment,
  InstructorAssessmentSummary,
  InstructorCourse,
  InstructorCourseSummary,
  LessonInput,
  QuestionInput,
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

export function updateCourse(id: number, changes: Partial<CourseInput> & { published?: boolean; scope?: CourseScope }) {
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

export function listCourseAssessments(courseId: number, signal?: AbortSignal) {
  return api.get<InstructorAssessmentSummary[]>(`/instructor/courses/${courseId}/assessments`, { signal })
}

export function createAssessment(courseId: number, input: AssessmentInput) {
  return api.post<{ id: number }>(`/instructor/courses/${courseId}/assessments`, input)
}

export function getMyAssessment(id: number, signal?: AbortSignal) {
  return api.get<InstructorAssessment>(`/instructor/assessments/${id}`, { signal })
}

export function updateAssessment(id: number, changes: Partial<AssessmentInput> & { published?: boolean }) {
  return api.patch<Ok>(`/instructor/assessments/${id}`, changes)
}

export function deleteAssessment(id: number) {
  return api.delete<Ok>(`/instructor/assessments/${id}`)
}

export function addQuestion(assessmentId: number, input: QuestionInput) {
  return api.post<{ id: number; position: number }>(`/instructor/assessments/${assessmentId}/questions`, input)
}

export function updateQuestion(questionId: number, input: QuestionInput) {
  return api.put<Ok>(`/instructor/questions/${questionId}`, input)
}

export function deleteQuestion(questionId: number) {
  return api.delete<Ok>(`/instructor/questions/${questionId}`)
}

export function moveQuestion(questionId: number, direction: 'up' | 'down') {
  return api.post<Ok>(`/instructor/questions/${questionId}/move`, { direction })
}
