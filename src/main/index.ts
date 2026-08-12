import { app, BrowserWindow, ipcMain, nativeTheme, session, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { LcuConnectionManager } from './lcu/connection-manager'
import { isAllowedAssetPath, isImportRunePageRequest } from './lcu/validate'
import { notify } from './notifications/notifier'
import * as runeBookStore from './rune-book/store'
import { readSettings, writeSettings } from './settings/store'
import { appUpdater } from './updater/auto-updater'

const APP_USER_MODEL_ID = 'com.ultk.app'

type EffectiveTheme = 'dark' | 'light'

const TITLEBAR_OVERLAY: Record<EffectiveTheme, Electron.TitleBarOverlayOptions> = {
  dark: { color: '#0b0d11', symbolColor: '#9aa1ad', height: 44 },
  light: { color: '#f4f5f7', symbolColor: '#4b525c', height: 44 }
}

const WINDOW_BACKGROUND: Record<EffectiveTheme, string> = {
  dark: '#0b0d11',
  light: '#f4f5f7'
}

let mainWindow: BrowserWindow | null = null
const lcuManager = new LcuConnectionManager()

function isEffectiveTheme(value: unknown): value is EffectiveTheme {
  return value === 'dark' || value === 'light'
}

async function resolveInitialTheme(): Promise<EffectiveTheme> {
  const settings = await readSettings()
  if (settings.theme === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }
  return settings.theme
}

function createWindow(initialTheme: EffectiveTheme): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    show: false,
    backgroundColor: WINDOW_BACKGROUND[initialTheme],
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: TITLEBAR_OVERLAY[initialTheme],
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  // Every outbound navigation/target=_blank goes to the OS browser, never a
  // new Electron window — this app has no legitimate reason to spawn one.
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function broadcast(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args)
}

function registerLcuBridge(): void {
  lcuManager.on('status', (status) => broadcast('lcu:status', status))
  lcuManager.on('summoner', (summoner) => broadcast('lcu:summoner', summoner))
  lcuManager.on('phase', (phase) => broadcast('lcu:phase', phase))
  lcuManager.on('activity', (activity) => broadcast('lcu:activity', activity))
  lcuManager.on('connectedAt', (connectedAt) => broadcast('lcu:connected-at', connectedAt))
  lcuManager.on('ranked', (ranked) => broadcast('lcu:ranked', ranked))
  lcuManager.on('gameSession', (session) => broadcast('lcu:game-session', session))

  // Only the time-sensitive transition gets an OS notification — everything
  // else is covered by the in-app activity feed.
  lcuManager.on('phase', (phase) => {
    if (phase === 'ReadyCheck') {
      void notify({ title: 'Ready check', body: 'Your match is ready — accept in the League Client.' })
    }
  })

  ipcMain.handle('lcu:get-snapshot', () => lcuManager.getSnapshot())
  ipcMain.handle('lcu:get-rune-pages', () => lcuManager.getRunePages())
  ipcMain.handle('lcu:get-match-history', () => lcuManager.getMatchHistory())
  ipcMain.handle('lcu:get-perk-catalog', () => lcuManager.getPerkCatalog())
  ipcMain.handle('lcu:get-champions', () => lcuManager.getChampions())
  ipcMain.handle('lcu:get-asset', (_event, path: unknown) => {
    if (!isAllowedAssetPath(path)) return Promise.reject(new Error('Asset path not allowed'))
    return lcuManager.getAsset(path)
  })
  ipcMain.handle('lcu:import-rune-page', (_event, request: unknown) => {
    if (!isImportRunePageRequest(request)) return Promise.reject(new Error('Invalid rune page payload'))
    return lcuManager.importRunePage(request)
  })

  lcuManager.start()
}

function registerRuneBookBridge(): void {
  ipcMain.handle('rune-book:get', () => runeBookStore.readBook())
  ipcMain.handle('rune-book:save-page', (_event, page: unknown) => runeBookStore.savePage(page))
  ipcMain.handle('rune-book:delete-page', (_event, id: unknown) => runeBookStore.deletePage(id))
}

function registerUpdaterBridge(): void {
  appUpdater.on('state', (state) => broadcast('update:state', state))

  ipcMain.handle('update:get-state', () => appUpdater.getState())
  ipcMain.handle('update:check', () => appUpdater.check())
  ipcMain.on('update:install', () => appUpdater.installNow())

  appUpdater.start()
}

function registerSettingsBridge(): void {
  ipcMain.handle('settings:get', () => readSettings())
  ipcMain.handle('settings:set', async (_event, partial: unknown) => {
    const updated = await writeSettings(partial)
    app.setLoginItemSettings({ openAtLogin: updated.launchOnStartup })
    return updated
  })

  // The renderer resolves 'system' theme itself (matchMedia) and reports
  // the effective light/dark back here so the native titlebar overlay,
  // which CSS can't reach, stays in sync — including live OS theme changes.
  ipcMain.on('theme:effective-changed', (_event, theme: unknown) => {
    if (!isEffectiveTheme(theme) || !mainWindow) return
    mainWindow.setTitleBarOverlay(TITLEBAR_OVERLAY[theme])
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId(APP_USER_MODEL_ID)

  const settings = await readSettings()
  app.setLoginItemSettings({ openAtLogin: settings.launchOnStartup })
  registerSettingsBridge()

  // Keep devtools/reload shortcuts out of production builds; harmless and
  // convenient in dev.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Dev needs 'unsafe-inline'/'unsafe-eval' for Vite's HMR client and React
    // Fast Refresh preamble — neither is present in the production build.
    const csp = is.dev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: http://localhost:*"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  ipcMain.handle('app:get-version', () => app.getVersion())

  createWindow(await resolveInitialTheme())
  registerLcuBridge()
  registerRuneBookBridge()
  registerUpdaterBridge()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(await resolveInitialTheme())
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  lcuManager.stop()
  appUpdater.stop()
})
