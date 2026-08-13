import { execFile, spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import type { ClientThemePackage } from '../../shared/client-theme-types'

// Vendored from PenguLoader (MIT license — see THIRD_PARTY_NOTICES.md),
// built by CI from native/vendor/pengu-loader and bundled as an
// electron-builder extraResource. Only the compiled core.dll is vendored —
// the orchestration below (registry write, plugin file management) is
// ULTK's own, reimplemented from reading PenguLoader's reference C#
// (loader/Main/IFEO.cs, loader/Main/Plugins.cs) rather than shipping their
// separate loader application, since we only need the DLL, not their UI.
const IFEO_VALUE_PATH =
  'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\LeagueClientUx.exe'
const PLUGIN_FILE_NAME = 'ultk-theme.js'

function resourcesRoot(): string {
  // Packaged builds get core.dll via electron-builder's extraResources,
  // landing next to the app in resources/. In dev there's no packaged
  // resources/ dir at all, so this points at a repo-relative folder instead
  // — populated by running the native build locally, same as CI does.
  return is.dev ? path.join(app.getAppPath(), 'resources', 'pengu-core') : path.join(process.resourcesPath, 'pengu-core')
}

function coreDllPath(): string {
  return path.join(resourcesRoot(), 'core.dll')
}

function pluginsDir(): string {
  // Matches PenguLoader's own config::plugins_dir() default: loader_dir()
  // (the directory core.dll lives in) + "plugins" — confirmed by reading
  // native/vendor/pengu-loader/core/src/config.cc directly rather than
  // assuming it.
  return path.join(resourcesRoot(), 'plugins')
}

// Registry writes to HKLM need elevation. Rather than run all of ULTK
// elevated the way PenguLoader's own loader app does (its App.manifest
// requests requireAdministrator for the whole process), this spawns one
// elevated reg.exe invocation just for the single value that needs it —
// everything else in ULTK keeps running unprivileged, per CLAUDE.md §3's
// Electron hardening defaults.
function runElevatedReg(regArgs: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const argList = regArgs.map((arg) => `'${arg.replace(/'/g, "''")}'`).join(',')
    const psCommand = `Start-Process -FilePath 'reg.exe' -ArgumentList ${argList} -Verb RunAs -Wait -WindowStyle Hidden`
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
      windowsHide: true
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error('The admin prompt was cancelled or the registry update failed.'))
        return
      }
      resolve()
    })
  })
}

// Points LeagueClientUx.exe's launch at PenguLoader's bootstrap export —
// Windows' Image File Execution Options "Debugger" mechanism runs this
// instead of the real exe, which is how core.dll ends up loaded before the
// client has finished starting. Confirmed against PenguLoader's own
// loader/Main/IFEO.cs and the @6000 export name in core/res/module.def.
export async function enable(): Promise<void> {
  const debuggerValue = `rundll32 "${coreDllPath()}",#6000`
  await runElevatedReg(['add', IFEO_VALUE_PATH, '/v', 'Debugger', '/t', 'REG_SZ', '/d', debuggerValue, '/f'])
}

// Reading HKLM doesn't need elevation (only writing does), so this can run
// any time to check current status without prompting for admin.
export function isEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('reg', ['query', IFEO_VALUE_PATH, '/v', 'Debugger'], { windowsHide: true }, (error) => {
      resolve(!error)
    })
  })
}

export async function disable(): Promise<void> {
  try {
    await runElevatedReg(['delete', IFEO_VALUE_PATH, '/f'])
  } catch {
    // Deleting a value that's already gone isn't a real failure — the end
    // state disable() promises (no Debugger override) already holds.
  }
}

export async function applyTheme(pkg: ClientThemePackage): Promise<void> {
  const dir = pluginsDir()
  await mkdir(dir, { recursive: true })

  const parts: string[] = []
  if (pkg.css) {
    parts.push(
      `const ultkStyle = document.createElement('style'); ultkStyle.textContent = ${JSON.stringify(pkg.css)}; document.head.appendChild(ultkStyle);`
    )
  }
  if (pkg.js) parts.push(pkg.js)

  await writeFile(path.join(dir, PLUGIN_FILE_NAME), parts.join('\n'), 'utf-8')
}

export async function removeTheme(): Promise<void> {
  await rm(path.join(pluginsDir(), PLUGIN_FILE_NAME), { force: true })
}
