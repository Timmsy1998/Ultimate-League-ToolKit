import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings-types'

const WRITE_DEBOUNCE_MS = 250

let cached: Settings | null = null
let writeTimer: NodeJS.Timeout | null = null

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function isPartialSettings(value: unknown): value is Partial<Settings> {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if ('theme' in v && !['dark', 'light', 'system'].includes(v.theme as string)) return false
  if ('launchOnStartup' in v && typeof v.launchOnStartup !== 'boolean') return false
  if ('notificationsEnabled' in v && typeof v.notificationsEnabled !== 'boolean') return false
  if ('autoAcceptReadyCheck' in v && typeof v.autoAcceptReadyCheck !== 'boolean') return false
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
