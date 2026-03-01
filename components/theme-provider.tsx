'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with 'system'; actual stored value applied on mount via ref trick
  const [theme, setThemeState] = useState<Theme>('system')
  const initialized = useRef(false)

  const setTheme = (t: Theme) => {
    applyTheme(t)
    localStorage.setItem('theme', t)
    setThemeState(t)
  }

  // One-time init: read storage and apply without triggering a setState-in-effect
  if (typeof window !== 'undefined' && !initialized.current) {
    initialized.current = true
    const stored = (localStorage.getItem('theme') as Theme) ?? 'system'
    if (stored !== 'system') {
      // Will be applied synchronously during render (safe — no effect needed)
      applyTheme(stored)
    }
  }

  // Sync OS preference changes when on 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Restore stored theme into state after mount (deferred to avoid hydration mismatch)
  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme) ?? 'system'
    if (stored !== theme) setThemeState(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
