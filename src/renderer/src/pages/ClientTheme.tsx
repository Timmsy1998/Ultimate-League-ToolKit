import { useEffect, useState } from 'react'
import { Check, FolderOpen, RefreshCw, ShieldCheck } from 'lucide-react'
import { Toggle } from '@renderer/components/Toggle/Toggle'
import { useSettings } from '@renderer/settings/SettingsContext'
import type { ClientThemeApplyResult } from '../../../shared/client-theme-types'
import themeStyles from './ClientTheme.module.css'
import styles from './Page.module.css'
import settingsStyles from './Settings.module.css'

function describeApplyResult(result: ClientThemeApplyResult): string {
  if (result.reloaded) return 'Saved — reloaded the League Client with the new theme.'
  switch (result.reason) {
    case 'hook-disabled':
      return 'Saved — enable the client hook above for this to apply automatically. Otherwise it takes effect next restart.'
    case 'not-connected':
      return "Saved — takes effect next time the League Client (re)starts (it's not running right now)."
    case 'unsafe-phase':
      return "Saved — didn't reload automatically since you're mid-match or in champ select. Takes effect next restart."
    case 'restart-failed':
      return 'Saved, but the automatic reload failed. Takes effect next time the client (re)starts.'
  }
}

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp'
const BACKGROUND_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'

function clientSideSizeLimit(mimeType: string): number {
  if (mimeType === 'image/gif') return 25 * 1024 * 1024
  if (mimeType === 'video/mp4' || mimeType === 'video/webm') return 250 * 1024 * 1024
  return 8 * 1024 * 1024
}

function describeBackgroundValue(value: string | null): string {
  if (!value) return 'Using the client default.'
  if (value.startsWith('data:')) return 'Custom background set.'
  const ext = value.split('.').pop()
  if (ext === 'mp4' || ext === 'webm') return 'Custom video background set.'
  if (ext === 'gif') return 'Custom GIF background set.'
  return 'Custom background set.'
}

const FONT_PRESETS = [
  { label: 'Client default', value: null },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace' }
] as const

const FONT_FILE_ACCEPT = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2'
const MAX_FONT_BYTES = 5 * 1024 * 1024

function describeFontAsset(value: string | null): string {
  return value ? 'Custom font set — overrides the preset above.' : 'Or upload your own TTF, OTF, WOFF, or WOFF2 file.'
}

type ImageField = 'clientThemeBannerImage' | 'clientThemeIconImage'

// Matches MAX_IMAGE_BYTES in asset-store.ts / MAX_DATA_URI_LENGTH in
// settings/store.ts — checked here too so an oversized banner/icon fails
// fast with a message instead of silently getting dropped by the settings
// write's own validation (which has no way to report back through
// SettingsContext's optimistic update).
const MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024

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
  accept?: string
  buttonLabel?: string
  onPick: (file: File) => void
  onClear: () => void
}

function ImagePickerRow({
  title,
  description,
  value,
  accept = IMAGE_ACCEPT,
  buttonLabel = 'Choose image',
  onPick,
  onClear
}: ImagePickerRowProps): React.JSX.Element {
  return (
    <div className={settingsStyles.row}>
      <div>
        <p className={settingsStyles.rowTitle}>{title}</p>
        <p className={settingsStyles.rowDescription}>{description}</p>
      </div>
      <div className={themeStyles.actions}>
        <label className={`${settingsStyles.updateButton} ${themeStyles.fileButton}`}>
          {buttonLabel}
          <input
            type="file"
            accept={accept}
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
  const [logLines, setLogLines] = useState<string[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [backgroundStatus, setBackgroundStatus] = useState<string | null>(null)
  const [fontStatus, setFontStatus] = useState<string | null>(null)
  const [imageStatus, setImageStatus] = useState<Partial<Record<ImageField, string>>>({})

  useEffect(() => {
    let cancelled = false
    window.api.clientTheme.status().then((enabled) => {
      if (!cancelled) setInjectorEnabled(enabled)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void loadLog()
  }, [])

  async function loadLog(): Promise<void> {
    setLogLoading(true)
    try {
      const lines = await window.api.clientTheme.getLog()
      setLogLines(lines)
    } finally {
      setLogLoading(false)
    }
  }

  async function pickImage(field: ImageField, file: File): Promise<void> {
    setImageStatus((prev) => ({ ...prev, [field]: undefined }))
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      const limitMb = Math.round(MAX_PROFILE_IMAGE_BYTES / (1024 * 1024))
      setImageStatus((prev) => ({ ...prev, [field]: `That file is too large (max ${limitMb} MB).` }))
      return
    }
    const dataUri = await readImageAsDataUri(file)
    updateSettings({ [field]: dataUri })
  }

  async function pickBackground(file: File): Promise<void> {
    setBackgroundStatus(null)
    const limit = clientSideSizeLimit(file.type)
    if (file.size > limit) {
      setBackgroundStatus(`That file is too large (max ${Math.round(limit / (1024 * 1024))} MB for this type).`)
      return
    }
    try {
      const bytes = await file.arrayBuffer()
      const filename = await window.api.clientTheme.setBackgroundAsset(bytes)
      updateSettings({ clientThemeBackground: filename })
    } catch (err) {
      setBackgroundStatus(err instanceof Error ? err.message : 'Failed to set background.')
    }
  }

  async function clearBackground(): Promise<void> {
    setBackgroundStatus(null)
    await window.api.clientTheme.clearBackgroundAsset()
    updateSettings({ clientThemeBackground: null })
  }

  async function pickFont(file: File): Promise<void> {
    setFontStatus(null)
    if (file.size > MAX_FONT_BYTES) {
      setFontStatus('That font file is too large (max 5 MB).')
      return
    }
    try {
      const bytes = await file.arrayBuffer()
      const filename = await window.api.clientTheme.setFontAsset(bytes)
      // Custom font and the preset dropdown are mutually exclusive — the
      // upload wins, so clear the preset here.
      updateSettings({ clientThemeCustomFontAsset: filename, clientThemeFont: null })
    } catch (err) {
      setFontStatus(err instanceof Error ? err.message : 'Failed to set font.')
    }
  }

  async function clearFont(): Promise<void> {
    setFontStatus(null)
    await window.api.clientTheme.clearFontAsset()
    updateSettings({ clientThemeCustomFontAsset: null })
  }

  async function pickFontPreset(value: string | null): Promise<void> {
    if (settings.clientThemeCustomFontAsset) {
      await window.api.clientTheme.clearFontAsset()
    }
    updateSettings({ clientThemeFont: value, clientThemeCustomFontAsset: null })
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
      void loadLog()
    }
  }

  async function applyToClient(): Promise<void> {
    setApplying(true)
    setApplyStatus(null)
    try {
      const result = await window.api.clientTheme.apply()
      setApplyStatus(describeApplyResult(result))
    } catch (err) {
      setApplyStatus(err instanceof Error ? err.message : 'Failed to apply theme.')
    } finally {
      setApplying(false)
      void loadLog()
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
        <h2 className={styles.sectionTitle}>Diagnostics</h2>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Client hook log</p>
              <p className={settingsStyles.rowDescription}>
                What ULTK did the last time it enabled, disabled, or applied the client hook — useful if something
                doesn't seem to be taking effect.
              </p>
            </div>
            <div className={themeStyles.actions}>
              <button type="button" className={settingsStyles.updateButton} onClick={() => void loadLog()}>
                {logLoading ? (
                  <RefreshCw size={14} strokeWidth={1.75} className={settingsStyles.spin} aria-hidden="true" />
                ) : (
                  <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
                Refresh
              </button>
              <button
                type="button"
                className={settingsStyles.updateButton}
                onClick={() => void window.api.clientTheme.openLogFolder()}
              >
                <FolderOpen size={14} strokeWidth={1.75} aria-hidden="true" />
                Open log folder
              </button>
            </div>
          </div>
          <pre className={themeStyles.logBox}>
            {logLines.length > 0 ? logLines.join('\n') : 'No log entries yet.'}
          </pre>
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
            description={backgroundStatus ?? describeBackgroundValue(settings.clientThemeBackground)}
            value={settings.clientThemeBackground}
            accept={BACKGROUND_ACCEPT}
            buttonLabel="Choose image, GIF, or video"
            onPick={(file) => void pickBackground(file)}
            onClear={() => void clearBackground()}
          />
          <div className={settingsStyles.divider} />
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Reduced motion</p>
              <p className={settingsStyles.rowDescription}>
                Skips playing video and GIF backgrounds — lighter on CPU/GPU. Worth turning on for older or laptop
                hardware.
              </p>
            </div>
            <Toggle
              checked={settings.clientThemeReducedMotion}
              onChange={(checked) => updateSettings({ clientThemeReducedMotion: checked })}
              label="Reduced motion"
            />
          </div>
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
              disabled={!!settings.clientThemeCustomFontAsset}
              onChange={(e) => void pickFontPreset(e.target.value || null)}
            >
              {FONT_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.value ?? ''}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className={settingsStyles.divider} />
          <ImagePickerRow
            title="Custom font"
            description={fontStatus ?? describeFontAsset(settings.clientThemeCustomFontAsset)}
            value={settings.clientThemeCustomFontAsset}
            accept={FONT_FILE_ACCEPT}
            buttonLabel="Choose font file"
            onPick={(file) => void pickFont(file)}
            onClear={() => void clearFont()}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile</h2>
        <div className={settingsStyles.panel}>
          <ImagePickerRow
            title="Profile banner"
            description={
              imageStatus.clientThemeBannerImage ??
              (settings.clientThemeBannerImage ? 'Custom banner set.' : 'Using your client banner.')
            }
            value={settings.clientThemeBannerImage}
            onPick={(file) => void pickImage('clientThemeBannerImage', file)}
            onClear={() => {
              setImageStatus((prev) => ({ ...prev, clientThemeBannerImage: undefined }))
              updateSettings({ clientThemeBannerImage: null })
            }}
          />
          <div className={settingsStyles.divider} />
          <ImagePickerRow
            title="Profile icon"
            description={
              imageStatus.clientThemeIconImage ??
              (settings.clientThemeIconImage ? 'Custom icon set.' : 'Using your client icon.')
            }
            value={settings.clientThemeIconImage}
            onPick={(file) => void pickImage('clientThemeIconImage', file)}
            onClear={() => {
              setImageStatus((prev) => ({ ...prev, clientThemeIconImage: undefined }))
              updateSettings({ clientThemeIconImage: null })
            }}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>In-client tools</h2>
        <div className={settingsStyles.panel}>
          <div className={settingsStyles.row}>
            <div>
              <p className={settingsStyles.rowTitle}>Show ULTK tools in the client</p>
              <p className={settingsStyles.rowDescription}>
                Adds a small ULTK panel inside the League Client itself for Dodge, Invite Friends, and Loot Helper —
                nothing else. Every action still needs an explicit click in that panel; nothing fires
                automatically. Requires the client hook above.
              </p>
            </div>
            <Toggle
              checked={settings.injectedToolsEnabled}
              onChange={(checked) => updateSettings({ injectedToolsEnabled: checked })}
              label="Show ULTK tools in the client"
            />
          </div>
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
              disabled={applying || (!settings.clientThemeEnabled && !settings.injectedToolsEnabled)}
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
