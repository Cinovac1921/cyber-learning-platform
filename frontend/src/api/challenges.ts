import type {
  Challenge,
  ChallengeInput,
  ChallengeSummary,
  FlagResult,
  InstructorChallenge,
  InstructorChallengeSummary,
  Leaderboard,
} from '../types/challenges'
import { api, downloadFile } from './client'

type Ok = { ok: boolean }

export function listChallenges(signal?: AbortSignal) {
  return api.get<ChallengeSummary[]>('/challenges', { signal })
}

export function getChallenge(id: number, signal?: AbortSignal) {
  return api.get<Challenge>(`/challenges/${id}`, { signal })
}

export function submitFlag(id: number, flag: string) {
  return api.post<FlagResult>(`/challenges/${id}/submit`, { flag })
}

export function getLeaderboard(signal?: AbortSignal) {
  return api.get<Leaderboard>('/challenges/leaderboard', { signal })
}

export function downloadChallengeFile(id: number, fileName: string) {
  return downloadFile(`/challenges/${id}/file`, fileName)
}

export function listMyChallenges(signal?: AbortSignal) {
  return api.get<InstructorChallengeSummary[]>('/instructor/challenges', { signal })
}

export function getMyChallenge(id: number, signal?: AbortSignal) {
  return api.get<InstructorChallenge>(`/instructor/challenges/${id}`, { signal })
}

export function createChallenge(input: ChallengeInput) {
  return api.post<{ id: number }>('/instructor/challenges', input)
}

export function updateChallenge(
  id: number,
  changes: Partial<ChallengeInput> & { published?: boolean },
) {
  return api.patch<Ok>(`/instructor/challenges/${id}`, changes)
}

export function deleteChallenge(id: number) {
  return api.delete<Ok>(`/instructor/challenges/${id}`)
}

export function uploadChallengeFile(id: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  return api.upload<{ name: string; size: number }>(`/instructor/challenges/${id}/file`, form)
}

export function removeChallengeFile(id: number) {
  return api.delete<Ok>(`/instructor/challenges/${id}/file`)
}

export function downloadMyChallengeFile(id: number, fileName: string) {
  return downloadFile(`/instructor/challenges/${id}/file`, fileName)
}
