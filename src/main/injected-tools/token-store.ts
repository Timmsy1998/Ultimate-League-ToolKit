import { app } from 'electron'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// A persisted (not per-session) secret: the injected panel's index.js only
// gets rewritten when the user clicks Save, so a token that rotated on
// every app restart would silently 401 the in-client buttons until the
// user revisited settings and saved again. Generated once, reused for the
// lifetime of the install unless this file is removed.
const TOKEN_PATTERN = /^[0-9a-f]{48}$/

let cached: string | null = null

function tokenPath(): string {
  return path.join(app.getPath('userData'), 'tools-token.txt')
}

export async function getOrCreateToolsToken(): Promise<string> {
  if (cached) return cached

  try {
    const raw = (await readFile(tokenPath(), 'utf-8')).trim()
    if (TOKEN_PATTERN.test(raw)) {
      cached = raw
      return cached
    }
  } catch {
    // No token on disk yet (or it's unreadable/malformed) — generate below.
  }

  const token = randomBytes(24).toString('hex')
  await mkdir(path.dirname(tokenPath()), { recursive: true })
  await writeFile(tokenPath(), token, 'utf-8')
  cached = token
  return cached
}
