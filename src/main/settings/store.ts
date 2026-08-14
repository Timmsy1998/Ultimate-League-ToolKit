import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings-types'

const WRITE_DEBOUNCE_MS = 250

// Generous enough for a reasonably-sized background/banner/icon image as a
// data URI, but bounded so a renderer bug (or bad actor with IPC access)
// can't grow settings.json without limit.
const MAX_DATA_URI_LENGTH = 2_000_000

let cached: Settings | null = null
let writeTimer: NodeJS.Timeout | null = null

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

// These values eventually get embedded as CSS/JS text applied to the League
// Client's own UI (see the client-theme feature) — validated by shape here,
// not just presence, since a malformed/malicious value would otherwise flow
// straight through to that boundary.
const DATA_IMAGE_URI_PATTERN = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/

function isNullableDataUri(value: unknown): boolean {
  if (value === null) return true
  return typeof value === 'string' && value.length <= MAX_DATA_URI_LENGTH && DATA_IMAGE_URI_PATTERN.test(value)
}

// Backgrounds are either a legacy data URI (old settings, images only) or
// a filename the client-theme asset store generated itself — never
// anything else, since that value later gets embedded as a plugin asset
// reference. See src/main/client-theme/asset-store.ts.
const BACKGROUND_ASSET_PATTERN = /^background\.(png|jpg|webp|gif|mp4|webm)$/

function isNullableBackgroundValue(value: unknown): boolean {
  if (value === null) return true
  if (typeof value !== 'string') return false
  return isNullableDataUri(value) || BACKGROUND_ASSET_PATTERN.test(value)
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function isNullableHexColor(value: unknown): boolean {
  return value === null || (typeof value === 'string' && HEX_COLOR_PATTERN.test(value))
}

const SAFE_FONT_NAME_PATTERN = /^[a-zA-Z0-9 ,'"-]{1,80}$/

function isNullableFontName(value: unknown): boolean {
  return value === null || (typeof value === 'string' && SAFE_FONT_NAME_PATTERN.test(value))
}

function isPartialSettings(value: unknown): value is Partial<Settings> {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if ('theme' in v && !['dark', 'light', 'system'].includes(v.theme as string)) return false
  if ('launchOnStartup' in v && typeof v.launchOnStartup !== 'boolean') return false
  if ('notificationsEnabled' in v && typeof v.notificationsEnabled !== 'boolean') return false
  if ('autoAcceptReadyCheck' in v && typeof v.autoAcceptReadyCheck !== 'boolean') return false
  if ('dodgeToolEnabled' in v && typeof v.dodgeToolEnabled !== 'boolean') return false
  if ('lootHelperEnabled' in v && typeof v.lootHelperEnabled !== 'boolean') return false
  if ('clientThemeEnabled' in v && typeof v.clientThemeEnabled !== 'boolean') return false
  if ('clientThemeBackground' in v && !isNullableBackgroundValue(v.clientThemeBackground)) return false
  if ('clientThemeReducedMotion' in v && typeof v.clientThemeReducedMotion !== 'boolean') return false
  if ('clientThemeAccentColor' in v && !isNullableHexColor(v.clientThemeAccentColor)) return false
  if ('clientThemeFont' in v && !isNullableFontName(v.clientThemeFont)) return false
  if ('clientThemeBannerImage' in v && !isNullableDataUri(v.clientThemeBannerImage)) return false
  if ('clientThemeIconImage' in v && !isNullableDataUri(v.clientThemeIconImage)) return false
  if ('inviteFriendsEnabled' in v && typeof v.inviteFriendsEnabled !== 'boolean') return false
  return true
}

export async function readSettings(): Promise<Settings> {
  if (cached) return cached

  try {
    const raw = await readFile(getSettingsPath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    cached = isPartialSettings(parsed) ? { ...DEFAULT_SETTINGS, ...parsed } : { ...DEFAULT_SETTINGS }
  } catch {
    cached = { ...DEFAULT_SETTINGS }
  }

  return cached
}

// Renderer-originated input — never trust the shape, silently drop
// anything that doesn't match the known Settings fields.
export async function writeSettings(partial: unknown): Promise<Settings> {
  const current = await readSettings()
  if (!isPartialSettings(partial)) return current

  cached = { ...current, ...partial }

  if (writeTimer) clearTimeout(writeTimer)
  const toPersist = cached
  writeTimer = setTimeout(() => {
    void persist(toPersist)
  }, WRITE_DEBOUNCE_MS)

  return cached
}

async function persist(settings: Settings): Promise<void> {
  const target = getSettingsPath()
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(settings, null, 2), 'utf-8')
}
