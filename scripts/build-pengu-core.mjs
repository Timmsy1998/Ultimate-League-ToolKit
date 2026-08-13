// Builds the vendored PenguLoader core.dll (native/vendor/pengu-loader —
// see THIRD_PARTY_NOTICES.md) and copies it to resources/pengu-core/, where
// electron-builder's extraResources config picks it up.
//
// Prerequisites this script assumes rather than checks:
//   - the submodule (and its own nested `core/cef` submodule) is checked
//     out: `git submodule update --init --recursive`
//   - `msbuild` is on PATH (Visual Studio Build Tools with the C++
//     workload locally; the `microsoft/setup-msbuild` action in CI)
//
// Not runnable/verified in this environment — no MSVC toolchain available
// here. First real build happens in CI or on a dev machine with Visual
// Studio installed.
//
// Runs as a predist:win/prebuild:win hook. Locally (no CI env var) it
// degrades gracefully if msbuild isn't found — logs a warning and leaves
// resources/pengu-core/ empty (still created, so electron-builder's
// extraResources glob doesn't error on a missing path) rather than
// breaking the whole build for contributors without Visual Studio. In CI
// (GitHub Actions sets CI=true automatically) msbuild is always set up via
// the microsoft/setup-msbuild action, so a failure there is a real
// regression, not an expected local-dev gap — this rethrows instead.
import { execFile } from 'node:child_process'
import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const root = path.resolve(import.meta.dirname, '..')
const submoduleDir = path.join(root, 'native', 'vendor', 'pengu-loader')
const solutionPath = path.join(submoduleDir, 'pengu.sln')
const builtDllPath = path.join(submoduleDir, 'bin', 'core.dll')
const outDir = path.join(root, 'resources', 'pengu-core')

async function main() {
  await mkdir(outDir, { recursive: true })

  try {
    await execFileAsync('msbuild', [solutionPath, '/t:core', '/p:Configuration=Release', '/p:Platform=x64'], {
      cwd: submoduleDir
    })
    await copyFile(builtDllPath, path.join(outDir, 'core.dll'))
    console.log(`Built and copied core.dll to ${outDir}`)
  } catch (err) {
    if (process.env.CI) throw err

    console.warn(
      `Skipping Client Theme native build (${err instanceof Error ? err.message : String(err)}). ` +
        'This is fine for local dev — the rest of the app builds normally, just without the client-hook DLL bundled. CI builds it via microsoft/setup-msbuild.'
    )
  }
}

await main()
