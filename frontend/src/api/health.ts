import type { HealthResponse } from '../types/api'
import { api } from './client'

export function getHealth(signal?: AbortSignal) {
  return api.get<HealthResponse>('/health', { signal })
}