export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  try { return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

export function setTheme(theme: Theme) {
  try { localStorage.setItem('theme', theme) } catch { /* Storage may be disabled. */ }
  document.documentElement.setAttribute('data-theme', theme)
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export function initTheme() {
  document.documentElement.setAttribute('data-theme', getTheme())
}
