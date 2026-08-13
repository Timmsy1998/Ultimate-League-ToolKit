import { useEffect, useState } from 'react'
import { Check, RefreshCw, ShieldCheck } from 'lucide-react'
import { Toggle } from '@renderer/components/Toggle/Toggle'
import { useSettings } from '@renderer/settings/SettingsContext'
import themeStyles from './ClientTheme.module.css'
import styles from './Page.module.css'
import settingsStyles from './Settings.module.css'

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp'

const FONT_PRESETS = [
  { label: 'Client default', value: null },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace' }
] as const

type ImageField = 'clientThemeBackground' | 'clientThemeBannerImage' | 'clientThemeIconImage'

function readImageAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface ImagePickerRowProps {
  title: string
  description: string
  value: string | null
  onPick: (file: File) => void
  onClear: () => void
}

function ImagePickerRow({ title, description, value, onPick, onClear }: ImagePickerRowProps): React.JSX.Element {
  return (
    <div className={settingsStyles.row}>
      <div>
        <p className={settingsStyles.rowTitle}>{title}</p>
        <p className={settingsStyles.rowDescription}>{description}</p>
      </div>
      <div className={themeStyles.actions}>
        <label className={`${settingsStyles.updateButton} ${themeStyles.fileButton}`}>
          Choose image
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            className={themeStyles.fileInput}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onPick(file)
            }}
          />
        </label>
        {value ? (
          <button type="button" className={settingsStyles.updateButton} onClick={onClear}>
            Remove
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function ClientTheme(): React.JSX.Element {
  const { settings, updateSettings } = useSettings()
  const [injectorEnabled, setInjectorEnabled] = useState<boolean | null>(null)
  const [injectorBusy, setInjectorBusy] = useState(false)
  const [injectorStatus, setInjectorStatus] = useState<string | null>(null)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.clientTheme.status().then((enabled) => {
      if (!cancelled) setInjectorEnabled(enabled)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function pickImage(field: ImageField, file: File): Promise<void> {
    const dataUri = await readImageAsDataUri(file)
    updateSettings({ [field]: dataUri })
  }

  async function toggleInjector(enable: boolean): Promise<void> {
    setInjectorBusy(true)
    setInjectorStatus(null)
    try {
      if (enable) {
        await window.api.clientTheme.enable()
        setInjectorEnabled(true)
        setInjectorStatus('Enabled — close and reopen the League Client for it to take effect.')
      } else {
        await window.api.clientTheme.disable()
        setInjectorEnabled(false)
        setInjectorStatus('Disabled — close and reopen the League Client to restore the default look.')
      }
    } catch (err) {
      setInjectorStatus(err instanceof Error ? err.message : 'Failed to update the client hook.')
    } finally {
      setInjectorBusy(false)
    }
  }

  async function applyToClient(): Promise<void> {
    setApplying(true)
    setApplyStatus(null)
    try {
      await window.api.clientTheme.apply()
      setApplyStatus('Saved — takes effect next time the League Client (re)starts.')
    } catch (err) {
      setApplyStatus(err instanceof Error ? err.message : 'Failed to apply theme.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Client Theme</h1>
          <p className={styles.pageSubtitle}>
            Cosmetic-only customization of the League Client's own look — background, accent color, font, and a
            custom profile banner/icon. Off by default.
          </p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Client hook</h2>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>
                {injectorEnabled === null ? 'Checking status…' : injectorEnabled ? 'Enabled' : 'Not enabled'}
              </p>
              <p className={settingsStyles.rowDescription}>
                {injectorStatus ??
                  'Enabling asks for admin permission once (a Windows registry change) and only takes effect the next time you start the League Client. Disabling removes it the same way and fully restores the default client.'}
              </p>
            </div>
            <button
              type="button"
              className={settingsStyles.updateButton}
              disabled={injectorBusy || injectorEnabled === null}
              onClick={() => void toggleInjector(!injectorEnabled)}
            >
              {injectorBusy ? (
                <RefreshCw size={14} strokeWidth={1.75} className={settingsStyles.spin} aria-hidden="true" />
              ) : (
                <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />
              )}
              {injectorEnabled ? 'Disable / restore default client' : 'Enable'}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Enable client theming</p>
              <p className={settingsStyles.rowDescription}>
                Master switch for everything below. Nothing here is applied to the client until this is on.
              </p>
            </div>
            <Toggle
              checked={settings.clientThemeEnabled}
              onChange={(checked) => updateSettings({ clientThemeEnabled: checked })}
              label="Enable client theming"
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={settingsStyles.panel}>
          <ImagePickerRow
            title="Background"
            description={settings.clientThemeBackground ? 'Custom background set.' : 'Using the client default.'}
            value={settings.clientThemeBackground}
            onPick={(file) => void pickImage('clientThemeBackground', file)}
            onClear={() => updateSettings({ clientThemeBackground: null })}
          />
          <div className={settingsStyles.divider} />
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Accent color</p>
              <p className={settingsStyles.rowDescription}>
                {settings.clientThemeAccentColor ?? 'Using the client default.'}
              </p>
            </div>
            <div className={themeStyles.actions}>
              <input
                type="color"
                className={themeStyles.colorInput}
                value={settings.clientThemeAccentColor ?? '#5865f2'}
                onChange={(e) => updateSettings({ clientThemeAccentColor: e.target.value })}
              />
              {settings.clientThemeAccentColor ? (
                <button
                  type="button"
                  className={settingsStyles.updateButton}
                  onClick={() => updateSettings({ clientThemeAccentColor: null })}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <div className={settingsStyles.divider} />
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Font</p>
              <p className={settingsStyles.rowDescription}>Applies to text across the client UI.</p>
            </div>
            <select
              className={themeStyles.fontSelect}
              value={settings.clientThemeFont ?? ''}
              onChange={(e) => updateSettings({ clientThemeFont: e.target.value || null })}
            >
              {FONT_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.value ?? ''}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile</h2>
        <div className={settingsStyles.panel}>
          <ImagePickerRow
            title="Profile banner"
            description={settings.clientThemeBannerImage ? 'Custom banner set.' : 'Using your client banner.'}
            value={settings.clientThemeBannerImage}
            onPick={(file) => void pickImage('clientThemeBannerImage', file)}
            onClear={() => updateSettings({ clientThemeBannerImage: null })}
          />
          <div className={settingsStyles.divider} />
          <ImagePickerRow
            title="Profile icon"
            description={settings.clientThemeIconImage ? 'Custom icon set.' : 'Using your client icon.'}
            value={settings.clientThemeIconImage}
            onPick={(file) => void pickImage('clientThemeIconImage', file)}
            onClear={() => updateSettings({ clientThemeIconImage: null })}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Save theme</p>
              <p className={settingsStyles.rowDescription}>
                {applyStatus ?? "Writes these settings to the client hook's plugin file."}
              </p>
            </div>
            <button
              type="button"
              className={settingsStyles.updateButton}
              onClick={() => void applyToClient()}
              disabled={applying || !settings.clientThemeEnabled}
            >
              {applying ? (
                <RefreshCw size={14} strokeWidth={1.75} className={settingsStyles.spin} aria-hidden="true" />
              ) : (
                <Check size={14} strokeWidth={1.75} aria-hidden="true" />
              )}
              Save theme
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
