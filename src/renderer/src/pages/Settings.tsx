import { CheckCircle2, Loader2, Monitor, Moon, RefreshCw, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Toggle } from '@renderer/components/Toggle/Toggle'
import { useSettings } from '@renderer/settings/SettingsContext'
import { useUpdater } from '@renderer/updater/UpdaterContext'
import type { ThemePreference } from '../../../shared/settings-types'
import styles from './Page.module.css'
import settingsStyles from './Settings.module.css'

const THEMES: { id: ThemePreference; label: string; icon: typeof Moon }[] = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor }
]

function useAppVersion(): string {
  const [version, setVersion] = useState('')

  useEffect(() => {
    let cancelled = false
    window.api.app.getVersion().then((v) => {
      if (!cancelled) setVersion(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return version
}

function updateStatusText(state: ReturnType<typeof useUpdater>['state']): string {
  switch (state.status) {
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return `Update ${state.version} found — downloading…`
    case 'downloading':
      return `Downloading update — ${state.percent}%`
    case 'downloaded':
      return `Update ${state.version} ready to install.`
    case 'not-available':
      return "You're up to date."
    case 'error':
      return `Update check failed — ${state.message}`
    default:
      return ''
  }
}

export function Settings(): React.JSX.Element {
  const { settings, updateSettings } = useSettings()
  const version = useAppVersion()
  const { state, check, install } = useUpdater()
  const statusText = updateStatusText(state)
  const busy = state.status === 'checking' || state.status === 'downloading'

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSubtitle}>Preferences are stored locally and never leave your machine.</p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Theme</p>
              <p className={settingsStyles.rowDescription}>Choose how ULTK looks.</p>
            </div>
            <div className={settingsStyles.themePicker} role="radiogroup" aria-label="Theme">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={settings.theme === id}
                  title={label}
                  className={
                    settings.theme === id
                      ? `${settingsStyles.themeOption} ${settingsStyles.themeOptionActive}`
                      : settingsStyles.themeOption
                  }
                  onClick={() => updateSettings({ theme: id })}
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span className={settingsStyles.srOnly}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>General</h2>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Launch on startup</p>
              <p className={settingsStyles.rowDescription}>Open ULTK automatically when you sign in to Windows.</p>
            </div>
            <Toggle
              checked={settings.launchOnStartup}
              onChange={(checked) => updateSettings({ launchOnStartup: checked })}
              label="Launch on startup"
            />
          </div>
          <div className={settingsStyles.divider} />
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Notifications</p>
              <p className={settingsStyles.rowDescription}>Show desktop alerts for client and queue events.</p>
            </div>
            <Toggle
              checked={settings.notificationsEnabled}
              onChange={(checked) => updateSettings({ notificationsEnabled: checked })}
              label="Notifications"
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Version</p>
              <p className={settingsStyles.rowDescription}>{version ? `ULTK ${version}` : 'ULTK'}</p>
              {statusText ? <p className={settingsStyles.rowDescription}>{statusText}</p> : null}
            </div>
            {state.status === 'downloaded' ? (
              <button type="button" className={settingsStyles.updateButton} onClick={install}>
                <CheckCircle2 size={14} strokeWidth={1.75} aria-hidden="true" />
                Restart & update
              </button>
            ) : (
              <button type="button" className={settingsStyles.updateButton} onClick={check} disabled={busy}>
                {busy ? (
                  <Loader2 size={14} strokeWidth={1.75} className={settingsStyles.spin} aria-hidden="true" />
                ) : (
                  <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
                Check for updates
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
