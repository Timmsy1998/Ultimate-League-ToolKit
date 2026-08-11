import { useEffect, useState } from 'react'
import { Sidebar, type PageId } from '@renderer/components/Sidebar/Sidebar'
import { TitleBar } from '@renderer/components/TitleBar/TitleBar'
import { LcuProvider } from '@renderer/lcu/LcuContext'
import { About } from '@renderer/pages/About'
import { Dashboard } from '@renderer/pages/Dashboard'
import { Notifications } from '@renderer/pages/Notifications'
import { Settings } from '@renderer/pages/Settings'
import { Tools } from '@renderer/pages/Tools'
import { SettingsProvider } from '@renderer/settings/SettingsContext'
import { useEffectiveTheme } from '@renderer/settings/useEffectiveTheme'
import styles from './App.module.css'

const PAGES: Record<PageId, React.ComponentType> = {
  dashboard: Dashboard,
  notifications: Notifications,
  tools: Tools,
  settings: Settings,
  about: About
}

// Applies the resolved theme to the DOM and reports it to main, which
// keeps the native titlebar overlay (CSS can't reach that) in sync.
function ThemeApplier(): null {
  const theme = useEffectiveTheme()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.api.theme.reportEffective(theme)
  }, [theme])

  return null
}

function Shell(): React.JSX.Element {
  const [page, setPage] = useState<PageId>('dashboard')
  const ActivePage = PAGES[page]

  return (
    <LcuProvider>
      <div className={styles.shell}>
        <TitleBar />
        <div className={styles.body}>
          <Sidebar active={page} onNavigate={setPage} />
          <main className={styles.content}>
            <ActivePage />
          </main>
        </div>
      </div>
    </LcuProvider>
  )
}

function App(): React.JSX.Element {
  return (
    <SettingsProvider>
      <ThemeApplier />
      <Shell />
    </SettingsProvider>
  )
}

export default App
