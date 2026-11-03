import { useCallback, useState } from 'react'

const FOCUS_KEY = 'cyberlearning.lessonFocus'

function readFocus(): boolean {
  try {
    return localStorage.getItem(FOCUS_KEY) === '1'
  } catch {
    return false
  }
}

/** Whether the lesson page hides the sidebar. The choice is remembered. */
export function useFocusMode(): [boolean, (next: boolean) => void] {
  const [focus, setFocus] = useState(readFocus)

  const update = useCallback((next: boolean) => {
    setFocus(next)
    try {
      localStorage.setItem(FOCUS_KEY, next ? '1' : '0')
    } catch {
      // Storage can be unavailable; the choice just won't survive a refresh.
    }
  }, [])

  return [focus, update]
}