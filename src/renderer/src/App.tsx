import { useEffect, useState } from 'react'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary/ErrorBoundary'
import { Sidebar, type PageId } from '@renderer/components/Sidebar/Sidebar'
import { TitleBar } from '@renderer/components/TitleBar/TitleBar'
import { UpdateBanner } from '@renderer/components/UpdateBanner/UpdateBanner'
import { LcuProvider } from '@renderer/lcu/LcuContext'
import { NavigationProvider } from '@renderer/navigation/NavigationContext'
import { About } from '@renderer/pages/About'
import { Dashboard } from '@renderer/pages/Dashboard'
import { Notifications } from '@renderer/pages/Notifications'
import { Rank } from '@renderer/pages/Rank'
import { RuneBook } from '@renderer/pages/RuneBook'
import { Settings } from '@renderer/pages/Settings'
import { Tools } from '@renderer/pages/Tools'
import { SettingsProvider } from '@renderer/settings/SettingsContext'
import { useEffectiveTheme } from '@renderer/settings/useEffectiveTheme'
import { UpdaterProvider } from '@renderer/updater/UpdaterContext'
import styles from './App.module.css'

const PAGES: Record<PageId, React.ComponentType> = {
  dashboard: Dashboard,
  notifications: Notifications,
  tools: Tools,
  rank: Rank,
  'rune-book': RuneBook,
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
      <NavigationProvider value={setPage}>
        <div className={styles.shell}>
          <TitleBar />
          <UpdateBanner />
          <div className={styles.body}>
            <Sidebar active={page} onNavigate={setPage} />
            <main className={styles.content}>
              <ErrorBoundary key={page}>
                <ActivePage />
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </NavigationProvider>
    </LcuProvider>
  )
}

function App(): React.JSX.Element {
  return (
    <SettingsProvider>
      <UpdaterProvider>
        <ThemeApplier />
        <Shell />
      </UpdaterProvider>
    </SettingsProvider>
  )
}

export default App
