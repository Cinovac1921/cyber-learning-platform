export type Theme = 'light' | 'dark'

const THEME_KEY = 'cyberlearning.theme'

/** The theme currently applied to the page (set early by index.html). Light is the default. */
export function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage can be unavailable; the choice just won't survive a refresh.
  }
}
