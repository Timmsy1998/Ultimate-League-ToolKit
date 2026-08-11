import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { LcuCredentials } from '../../shared/lcu-types'

const execFileAsync = promisify(execFile)

const DEFAULT_LOCKFILE_PATH = 'C:\\Riot Games\\League of Legends\\lockfile'

async function readLockfile(path: string): Promise<LcuCredentials | null> {
  try {
    const contents = await readFile(path, 'utf-8')
    const parts = contents.trim().split(':')
    if (parts.length < 5) return null
    const port = Number(parts[2])
    const password = parts[3]
    if (!Number.isInteger(port) || !password) return null
    return { port, password }
  } catch {
    return null
  }
}

// Fallback for a non-default install location: ask Windows for the running
// client's own command line, which carries the same port/token the
// lockfile would. Only invoked occasionally (see connection-manager) since
// spawning PowerShell isn't as cheap as reading a file.
async function readFromProcess(): Promise<LcuCredentials | null> {
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine"
      ],
      { timeout: 5000, windowsHide: true }
    )

    const portMatch = stdout.match(/--app-port=(\d+)/)
    const tokenMatch = stdout.match(/--remoting-auth-token=([\w-]+)/)
    if (!portMatch || !tokenMatch) return null

    return { port: Number(portMatch[1]), password: tokenMatch[1] }
  } catch {
    return null
  }
}

export async function findLcuCredentials(useProcessFallback: boolean): Promise<LcuCredentials | null> {
  const fromLockfile = await readLockfile(DEFAULT_LOCKFILE_PATH)
  if (fromLockfile) return fromLockfile

  if (!useProcessFallback) return null
  return readFromProcess()
}
