import type { DashboardData } from '../types/learning'
import { api } from './client'

export function fetchDashboard(signal?: AbortSignal) {
  // The browser's time zone offset lets the server count "this week" in local time.
  const tzOffset = new Date().getTimezoneOffset()
  return api.get<DashboardData>(`/dashboard?tzOffset=${tzOffset}`, { signal })
}