import { useEffect, useState } from 'react'
import { useSettings } from './SettingsContext'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useEffectiveTheme(): 'dark' | 'light' {
  const { settings } = useSettings()
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent): void => setSystemDark(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  return settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme
}
