import { useEffect, useState } from 'react'
import { getHealth } from '../api/health'

export type BackendStatus = 'checking' | 'online' | 'offline'

const RECHECK_MS = 30_000

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    let controller = new AbortController()

    async function check() {
      controller = new AbortController()
      try {
        await getHealth(controller.signal)
        setStatus('online')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('offline')
      }
    }

    void check()
    const timer = setInterval(() => void check(), RECHECK_MS)

    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [])

  return status
}