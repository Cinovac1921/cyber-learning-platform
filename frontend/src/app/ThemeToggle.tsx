import { useState } from 'react'
import { applyTheme, readTheme, type Theme } from './theme'

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  function choose(next: Theme) {
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div role="group" aria-label="Theme" className="theme-toggle">
      <button
        type="button"
        aria-label="Light theme"
        title="Light"
        aria-pressed={theme === 'light'}
        onClick={() => choose('light')}
      >
        <SunIcon />
      </button>
      <button
        type="button"
        aria-label="Dark theme"
        title="Dark"
        aria-pressed={theme === 'dark'}
        onClick={() => choose('dark')}
      >
        <MoonIcon />
      </button>
    </div>
  )
}