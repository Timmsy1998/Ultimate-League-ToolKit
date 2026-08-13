// electron-builder generates release/latest.yml (the manifest electron-updater
// checks against) with a sha512/size computed from the *unsigned* installer.
// Signing happens after that build step (see .github/workflows/release.yml),
// so the manifest has to be patched to match the now-signed bytes — otherwise
// the in-app updater fails with a checksum mismatch on every download.
import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'

const root = path.resolve(import.meta.dirname, '..')
const releaseDir = path.join(root, 'release')
const manifestPath = path.join(releaseDir, 'latest.yml')

async function findInstaller() {
  const entries = await readdir(releaseDir)
  const installers = entries.filter((name) => name.endsWith('-setup.exe'))
  if (installers.length !== 1) {
    throw new Error(`Expected exactly one *-setup.exe in ${releaseDir}, found ${installers.length}`)
  }
  return installers[0]
}

function patchEntry(entry, fileName, sha512, size) {
  if (!entry || typeof entry !== 'object') return
  if (entry.url === fileName || entry.path === fileName) {
    entry.sha512 = sha512
    if ('size' in entry) entry.size = size
  }
}

async function main() {
  const installerName = await findInstaller()
  const installerPath = path.join(releaseDir, installerName)

  const [buffer, stats, manifestRaw] = await Promise.all([
    readFile(installerPath),
    stat(installerPath),
    readFile(manifestPath, 'utf-8')
  ])

  const sha512 = createHash('sha512').update(buffer).digest('base64')
  const manifest = yaml.load(manifestRaw)

  patchEntry(manifest, installerName, sha512, stats.size)
  if (Array.isArray(manifest.files)) {
    for (const entry of manifest.files) patchEntry(entry, installerName, sha512, stats.size)
  }

  await writeFile(manifestPath, yaml.dump(manifest), 'utf-8')
  console.log(`Updated ${manifestPath} for ${installerName} (sha512=${sha512}, size=${stats.size})`)
}

await main()
