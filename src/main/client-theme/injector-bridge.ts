import { execFile, spawn } from 'node:child_process'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import type { ClientThemePackage } from '../../shared/client-theme-types'
import { readBackgroundAsset, readFontAsset } from './asset-store'
import { logLine } from './logger'

// Vendored from PenguLoader (MIT license — see THIRD_PARTY_NOTICES.md),
// built by CI from native/vendor/pengu-loader and bundled as an
// electron-builder extraResource. Only the compiled core.dll is vendored —
// the orchestration below (registry write, plugin file management) is
// ULTK's own, reimplemented from reading PenguLoader's reference C#
// (loader/Main/IFEO.cs, loader/Main/Plugins.cs) rather than shipping their
// separate loader application, since we only need the DLL, not their UI.
const IFEO_VALUE_PATH =
  'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\LeagueClientUx.exe'
// PenguLoader discovers plugins by folder, not by loose file — each plugin
// is its own subdirectory with an index.js entry point (confirmed against
// PenguLoader/docs' javascript-plugin.md and module-system.md). A flat
// ultk-theme.js sitting directly in plugins/ is invisible to it.
const PLUGIN_DIR_NAME = 'ultk-theme'
// Separate plugin directory for the functional in-client tools panel
// (CLAUDE.md §5b) — kept apart from the cosmetic ultk-theme plugin so the
// two carve-outs (5a cosmetic, 5b functional) stay independently
// enable/disable-able and one being removed never touches the other's file.
const TOOLS_PLUGIN_DIR_NAME = 'ultk-tools'
const PLUGIN_ENTRY_FILE = 'index.js'

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

function pluginDir(): string {
  return path.join(pluginsDir(), PLUGIN_DIR_NAME)
}

function toolsPluginDir(): string {
  return path.join(pluginsDir(), TOOLS_PLUGIN_DIR_NAME)
}

// Windows command-line argument quoting per the CommandLineToArgvW
// convention that reg.exe (like any standard console app) expects: wrap in
// double quotes if the value has whitespace or a literal quote, doubling
// any backslash run that immediately precedes a quote and escaping the
// quote itself. Needed because the Debugger value below
// (`rundll32 "C:\...\core.dll",#6000`) already contains embedded double
// quotes and a comma — PowerShell's own Start-Process -ArgumentList,
// given an *array* of loosely-quoted strings, doesn't reliably re-escape
// an element that already contains embedded quotes when it flattens the
// array into the actual process command line, which was silently
// mangling this argument and making reg.exe fail even with UAC approved.
// Building the exact command line ourselves and passing it as a single
// string sidesteps that flattening step entirely.
function quoteWindowsArg(arg: string): string {
  if (arg.length > 0 && !/[\s"]/.test(arg)) return arg
  let result = '"'
  let backslashes = 0
  for (const ch of arg) {
    if (ch === '\\') {
      backslashes++
      continue
    }
    if (ch === '"') {
      result += '\\'.repeat(backslashes * 2 + 1) + '"'
      backslashes = 0
      continue
    }
    result += '\\'.repeat(backslashes) + ch
    backslashes = 0
  }
  result += '\\'.repeat(backslashes * 2) + '"'
  return result
}

// Registry writes to HKLM need elevation. Rather than run all of ULTK
// elevated the way PenguLoader's own loader app does (its App.manifest
// requests requireAdministrator for the whole process), this spawns one
// elevated reg.exe invocation just for the single value that needs it —
// everything else in ULTK keeps running unprivileged, per CLAUDE.md §3's
// Electron hardening defaults.
function runElevatedReg(regArgs: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const regCommandLine = regArgs.map(quoteWindowsArg).join(' ')
    const escapedForPowerShell = regCommandLine.replace(/'/g, "''")
    // -PassThru is required to get reg.exe's own exit code back. Without
    // it, `Start-Process -Wait` only reports whether *launching* the
    // elevated process succeeded — if reg.exe itself then failed (or
    // returned non-zero for any reason short of the UAC prompt being
    // cancelled outright), the outer powershell.exe still exits 0 and
    // this looked like success even though nothing was written.
    const psCommand = `$p = Start-Process -FilePath 'reg.exe' -ArgumentList '${escapedForPowerShell}' -Verb RunAs -Wait -WindowStyle Hidden -PassThru; exit $p.ExitCode`
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

async function coreDllExists(): Promise<boolean> {
  try {
    await stat(coreDllPath())
    return true
  } catch {
    return false
  }
}

// Points LeagueClientUx.exe's launch at PenguLoader's bootstrap export —
// Windows' Image File Execution Options "Debugger" mechanism runs this
// instead of the real exe, which is how core.dll ends up loaded before the
// client has finished starting. Confirmed against PenguLoader's own
// loader/Main/IFEO.cs and the @6000 export name in core/res/module.def.
export async function enable(): Promise<void> {
  if (!(await coreDllExists())) {
    const message = `core.dll not found at ${coreDllPath()} — run the native build first`
    await logLine('enable() aborted: core.dll missing', coreDllPath())
    throw new Error(message)
  }

  const debuggerValue = `rundll32 "${coreDllPath()}",#6000`
  try {
    await runElevatedReg(['add', IFEO_VALUE_PATH, '/v', 'Debugger', '/t', 'REG_SZ', '/d', debuggerValue, '/f'])
    // Belt-and-braces beyond the exit-code fix above: read the value back
    // for real rather than trusting the write reported success.
    if (!(await isEnabled())) {
      throw new Error('The registry update did not take effect — try again, or check that UAC was approved.')
    }
    await logLine('enable() succeeded', { coreDllPath: coreDllPath() })
  } catch (error) {
    await logLine('enable() failed', error)
    throw error
  }
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
  } catch (error) {
    // Deleting a value that's already gone isn't a real failure — the end
    // state disable() promises (no Debugger override) already holds, as
    // long as the verification below actually confirms that.
    await logLine('disable() reg delete errored (likely already absent)', error)
  }

  if (await isEnabled()) {
    const error = new Error('The registry update did not take effect — try again, or check that UAC was approved.')
    await logLine('disable() failed', error)
    throw error
  }
  await logLine('disable() succeeded')
}

// Copies (or clears) an active asset file into the plugin's own assets/
// folder — PenguLoader only resolves asset URLs relative to the plugin
// that references them, so the source-of-truth copy in userData isn't
// reachable from the client's page directly. Only touches files sharing
// the given prefix, so background.* and custom-font.* never clobber
// each other on the same apply.
async function syncAsset(
  prefix: string,
  filename: string | null,
  readAsset: (name: string) => Promise<Buffer>
): Promise<void> {
  const assetsDestDir = path.join(pluginDir(), 'assets')
  await mkdir(assetsDestDir, { recursive: true })

  const existing = await readdir(assetsDestDir).catch(() => [] as string[])
  await Promise.all(
    existing
      .filter((name) => name.startsWith(prefix) && name !== filename)
      .map((name) => rm(path.join(assetsDestDir, name), { force: true }))
  )

  if (filename) {
    const bytes = await readAsset(filename)
    await writeFile(path.join(assetsDestDir, filename), bytes)
  }
}

export async function applyTheme(pkg: ClientThemePackage): Promise<void> {
  const dir = pluginDir()
  await mkdir(dir, { recursive: true })

  const parts: string[] = []
  if (pkg.css) {
    parts.push(
      `const ultkStyle = document.createElement('style'); ultkStyle.textContent = ${JSON.stringify(pkg.css)}; document.head.appendChild(ultkStyle);`
    )
  }
  if (pkg.js) parts.push(pkg.js)

  try {
    await writeFile(path.join(dir, PLUGIN_ENTRY_FILE), parts.join('\n'), 'utf-8')
    await syncAsset('background.', pkg.backgroundAssetFilename, readBackgroundAsset)
    await syncAsset('custom-font.', pkg.fontAssetFilename, readFontAsset)
    await logLine('applyTheme() wrote plugin', {
      dir,
      backgroundAsset: pkg.backgroundAssetFilename,
      fontAsset: pkg.fontAssetFilename
    })
  } catch (error) {
    await logLine('applyTheme() failed', error)
    throw error
  }
}

export async function removeTheme(): Promise<void> {
  await rm(pluginDir(), { recursive: true, force: true })
  await logLine('removeTheme() removed plugin dir', { dir: pluginDir() })
}

export async function applyTools(js: string): Promise<void> {
  const dir = toolsPluginDir()
  await mkdir(dir, { recursive: true })
  try {
    await writeFile(path.join(dir, PLUGIN_ENTRY_FILE), js, 'utf-8')
    await logLine('applyTools() wrote plugin', { dir })
  } catch (error) {
    await logLine('applyTools() failed', error)
    throw error
  }
}

export async function removeTools(): Promise<void> {
  await rm(toolsPluginDir(), { recursive: true, force: true })
  await logLine('removeTools() removed plugin dir', { dir: toolsPluginDir() })
}
