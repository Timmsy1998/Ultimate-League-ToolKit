import { app } from 'electron'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Diagnostics for the client-hook flow (registry write, plugin file write,
// admin-prompt outcome) — these steps happen off in the main process with
// nothing visible in the renderer, so failures were previously silent.
// Low-frequency, user-triggered actions only (enable/disable/apply), so a
// plain append-and-trim file is enough — no need for a logging library.
const MAX_LINES = 500

export function getLogFilePath(): string {
  return path.join(app.getPath('userData'), 'logs', 'client-theme.log')
}

// Lets callers (e.g. "reveal in Explorer") guarantee the folder exists
// before pointing the OS at it, without duplicating the mkdir/path logic.
export async function ensureLogDirectory(): Promise<void> {
  await mkdir(path.dirname(getLogFilePath()), { recursive: true })
}

function formatDetail(detail: unknown): string {
  if (detail instanceof Error) return detail.stack ?? detail.message
  if (typeof detail === 'string') return detail
  try {
    return JSON.stringify(detail)
  } catch {
    return String(detail)
  }
}

export async function logLine(message: string, detail?: unknown): Promise<void> {
  const target = getLogFilePath()
  const timestamp = new Date().toISOString()
  const detailText = detail === undefined ? '' : ` ${formatDetail(detail)}`
  await mkdir(path.dirname(target), { recursive: true })
  await appendFile(target, `[${timestamp}] ${message}${detailText}\n`, 'utf-8')
  await trimIfNeeded(target)
}

async function trimIfNeeded(target: string): Promise<void> {
  let content: string
  try {
    content = await readFile(target, 'utf-8')
  } catch {
    return
  }
  const lines = content.split('\n').filter(Boolean)
  if (lines.length <= MAX_LINES) return
  await writeFile(target, lines.slice(lines.length - MAX_LINES).join('\n') + '\n', 'utf-8')
}

export async function readRecentLines(count = 200): Promise<string[]> {
  try {
    const content = await readFile(getLogFilePath(), 'utf-8')
    return content.split('\n').filter(Boolean).slice(-count)
  } catch {
    return []
  }
}
