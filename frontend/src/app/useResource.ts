import { useCallback, useEffect, useRef, useState } from 'react'

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: T }

type Settled<T> = {
  key: string
  result: { status: 'error'; error: unknown } | { status: 'ready'; data: T }
}

/**
 * Loads data when `key` changes. Use a key that describes what is loaded,
 * for example `course:${slug}`, so changing it fetches again.
 * `reload()` fetches again and keeps showing the old data until the new data arrives.
 */
export function useReloadableResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
): { resource: Resource<T>; reload: () => void } {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [reloads, setReloads] = useState(0)
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    const controller = new AbortController()

    loadRef
      .current(controller.signal)
      .then((data) => setSettled({ key, result: { status: 'ready', data } }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSettled({ key, result: { status: 'error', error } })
      })

    return () => controller.abort()
  }, [key, reloads])

  const reload = useCallback(() => setReloads((count) => count + 1), [])

  const resource: Resource<T> =
    !settled || settled.key !== key ? { status: 'loading' } : settled.result

  return { resource, reload }
}

export function useResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>): Resource<T> {
  return useReloadableResource(key, load).resource
}