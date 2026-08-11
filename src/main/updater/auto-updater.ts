import { app } from 'electron'
import { EventEmitter } from 'node:events'
import { autoUpdater } from 'electron-updater'
import type { UpdaterState } from '../../shared/updater-types'

// GitHub Releases has no push mechanism for this, so a poll is unavoidable —
// keep it as infrequent as reasonably possible per the "longest acceptable
// interval" rule. A check also always runs once, shortly after launch.
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000
const STARTUP_DELAY_MS = 10_000

export declare interface AppUpdater {
  on(event: 'state', listener: (state: UpdaterState) => void): this
}

export class AppUpdater extends EventEmitter {
  private state: UpdaterState = { status: 'idle' }
  private timer: NodeJS.Timeout | null = null
  private started = false

  start(): void {
    if (this.started) return
    this.started = true

    // No update feed exists for unpackaged dev builds — checking would just
    // error on every launch.
    if (!app.isPackaged) return

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => this.setState({ status: 'checking' }))
    autoUpdater.on('update-available', (info) => this.setState({ status: 'available', version: info.version }))
    autoUpdater.on('update-not-available', () => this.setState({ status: 'not-available' }))
    autoUpdater.on('download-progress', (progress) =>
      this.setState({ status: 'downloading', percent: Math.round(progress.percent) })
    )
    autoUpdater.on('update-downloaded', (info) => this.setState({ status: 'downloaded', version: info.version }))
    autoUpdater.on('error', (error: Error) => this.setState({ status: 'error', message: error.message }))

    setTimeout(() => void this.check(), STARTUP_DELAY_MS)
    this.timer = setInterval(() => void this.check(), CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  getState(): UpdaterState {
    return this.state
  }

  async check(): Promise<void> {
    if (!app.isPackaged) return
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // Already surfaced via the 'error' event — a failed check (e.g. no
      // network) shouldn't take down the interval loop.
    }
  }

  // electron-updater verifies the downloaded artifact's checksum (from the
  // published latest.yml) before this point, so quitAndInstall only ever
  // runs against a file that matched what CI published.
  installNow(): void {
    if (this.state.status !== 'downloaded') return
    autoUpdater.quitAndInstall()
  }

  private setState(state: UpdaterState): void {
    this.state = state
    this.emit('state', state)
  }
}

export const appUpdater = new AppUpdater()
