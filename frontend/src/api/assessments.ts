import type { AnswerInput, AssessmentSummary, AttemptResult, Quiz } from '../types/assessments'
import { api } from './client'

export function listAssessments(signal?: AbortSignal) {
  return api.get<AssessmentSummary[]>('/assessments', { signal })
}

export function getAssessment(id: number, signal?: AbortSignal) {
  return api.get<Quiz>(`/assessments/${id}`, { signal })
}

/** Sends every answer at once. The server grades them and returns the full result. */
export function submitAttempt(id: number, answers: AnswerInput[]) {
  return api.post<AttemptResult>(`/assessments/${id}/attempts`, { answers })
}

export function getAttempt(id: number, attemptId: number, signal?: AbortSignal) {
  return api.get<AttemptResult>(`/assessments/${id}/attempts/${attemptId}`, { signal })
}
