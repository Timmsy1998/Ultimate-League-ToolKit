import { lazy, Suspense, useEffect, useState } from 'react'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary/ErrorBoundary'
import { Sidebar, type PageId } from '@renderer/components/Sidebar/Sidebar'
import { TitleBar } from '@renderer/components/TitleBar/TitleBar'
import { UpdateBanner } from '@renderer/components/UpdateBanner/UpdateBanner'
import { LcuProvider } from '@renderer/lcu/LcuContext'
import { NavigationProvider } from '@renderer/navigation/NavigationContext'
import { SettingsProvider } from '@renderer/settings/SettingsContext'
import { useEffectiveTheme } from '@renderer/settings/useEffectiveTheme'
import { UpdaterProvider } from '@renderer/updater/UpdaterContext'
import styles from './App.module.css'

// Lazy so each page's code (and whatever it pulls in — recharts for Rank,
// in particular) only loads once actually navigated to, instead of every
// page executing eagerly on launch regardless of which one is shown first.
const PAGES: Record<PageId, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: lazy(() => import('@renderer/pages/Dashboard').then((m) => ({ default: m.Dashboard }))),
  notifications: lazy(() => import('@renderer/pages/Notifications').then((m) => ({ default: m.Notifications }))),
  tools: lazy(() => import('@renderer/pages/Tools').then((m) => ({ default: m.Tools }))),
  rank: lazy(() => import('@renderer/pages/Rank').then((m) => ({ default: m.Rank }))),
  'rune-book': lazy(() => import('@renderer/pages/RuneBook').then((m) => ({ default: m.RuneBook }))),
  'client-theme': lazy(() => import('@renderer/pages/ClientTheme').then((m) => ({ default: m.ClientTheme }))),
  settings: lazy(() => import('@renderer/pages/Settings').then((m) => ({ default: m.Settings }))),
  about: lazy(() => import('@renderer/pages/About').then((m) => ({ default: m.About })))
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
                <Suspense fallback={null}>
                  <ActivePage />
                </Suspense>
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
