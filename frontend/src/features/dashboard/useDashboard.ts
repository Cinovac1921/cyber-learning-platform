import { useEffect, useState } from 'react'
import { fetchDashboard } from '../../api/dashboard'
import type { DashboardData } from '../../types/learning'

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: DashboardData }

export function useDashboard(): DashboardState {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetchDashboard(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [])

  return state
}