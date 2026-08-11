import { useState } from 'react'
import { Monitor, Moon, RefreshCw, Sun } from 'lucide-react'
import { Toggle } from '@renderer/components/Toggle/Toggle'
import styles from './Page.module.css'
import settingsStyles from './Settings.module.css'

const THEMES = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor }
] as const

type ThemeId = (typeof THEMES)[number]['id']

export function Settings(): React.JSX.Element {
  const [launchOnStartup, setLaunchOnStartup] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [theme, setTheme] = useState<ThemeId>('dark')

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
                  aria-checked={theme === id}
                  title={label}
                  className={
                    theme === id
                      ? `${settingsStyles.themeOption} ${settingsStyles.themeOptionActive}`
                      : settingsStyles.themeOption
                  }
                  onClick={() => setTheme(id)}
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
            <Toggle checked={launchOnStartup} onChange={setLaunchOnStartup} label="Launch on startup" />
          </div>
          <div className={settingsStyles.divider} />
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Notifications</p>
              <p className={settingsStyles.rowDescription}>Show desktop alerts for client and queue events.</p>
            </div>
            <Toggle checked={notifications} onChange={setNotifications} label="Notifications" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Version</p>
              <p className={settingsStyles.rowDescription}>ULTK 0.1.0</p>
            </div>
            <button type="button" className={settingsStyles.updateButton} disabled>
              <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
              Check for updates
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
