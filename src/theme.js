import { useEffect, useState } from 'react'

const THEME_KEY = 'dsa-theme'

// 'system' follows the OS setting; 'light' or 'dark' is an explicit choice that
// index.html also applies before first paint.
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) ?? 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Storage blocked - the theme still applies for this visit.
    }
  }, [theme])

  return [theme, setTheme]
}

export function resolvesToDark(theme) {
  if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches
  return theme === 'dark'
}
