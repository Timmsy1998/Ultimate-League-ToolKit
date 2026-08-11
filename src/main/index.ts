import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { LcuConnectionManager } from './lcu/connection-manager'

const APP_USER_MODEL_ID = 'com.ultk.app'

let mainWindow: BrowserWindow | null = null
const lcuManager = new LcuConnectionManager()

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    show: false,
    backgroundColor: '#0b0d11',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0b0d11',
      symbolColor: '#9aa1ad',
      height: 44
    },
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

  ipcMain.handle('lcu:get-snapshot', () => lcuManager.getSnapshot())

  lcuManager.start()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(APP_USER_MODEL_ID)

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

  createWindow()
  registerLcuBridge()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  lcuManager.stop()
})
