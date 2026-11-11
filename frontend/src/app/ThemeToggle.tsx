import { useState } from 'react'
import { MoonIcon, SunIcon } from '../components/Icons'
import { applyTheme, readTheme, type Theme } from './theme'

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
        <SunIcon size={19} />
      </button>
      <button
        type="button"
        aria-label="Dark theme"
        title="Dark"
        aria-pressed={theme === 'dark'}
        onClick={() => choose('dark')}
      >
        <MoonIcon size={19} />
      </button>
    </div>
  )
}
