import { app } from 'electron'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Large client-theme assets (background media, later custom fonts) live as
// real files here instead of base64 inside settings.json — a 100MB video
// as a data URI would make every settings read/write parse megabytes of
// text for no reason. Only one background is ever active, so files are
// overwritten in place under a fixed, main-process-chosen name — never the
// name the renderer uploaded — which also closes off any path-traversal
// surface entirely.
export type BackgroundKind = 'image' | 'gif' | 'video'

interface SniffResult {
  ext: string
  kind: BackgroundKind
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_GIF_BYTES = 25 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

const BACKGROUND_EXTENSIONS = ['png', 'jpg', 'webp', 'gif', 'mp4', 'webm']

export function assetsDir(): string {
  return path.join(app.getPath('userData'), 'client-theme-assets')
}

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false
  return bytes.every((b, i) => buf[offset + i] === b)
}

// Sniffs actual file contents — never trusts the extension or MIME type
// the renderer claims for an uploaded file.
function sniffBackground(bytes: Buffer): SniffResult | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return { ext: 'png', kind: 'image' }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: 'jpg', kind: 'image' }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', kind: 'image' }
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) {
    return { ext: 'gif', kind: 'gif' }
  }
  // MP4/ISO-BMFF: a 4-byte box size followed by an "ftyp" box type at
  // offset 4 — standard container sniff, not tied to any specific brand.
  if (bytes.length >= 8 && bytes.toString('ascii', 4, 8) === 'ftyp') {
    return { ext: 'mp4', kind: 'video' }
  }
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return { ext: 'webm', kind: 'video' }
  return null
}

function maxBytesFor(kind: BackgroundKind): number {
  if (kind === 'image') return MAX_IMAGE_BYTES
  if (kind === 'gif') return MAX_GIF_BYTES
  return MAX_VIDEO_BYTES
}

export async function saveBackgroundAsset(bytes: Buffer): Promise<string> {
  const sniffed = sniffBackground(bytes)
  if (!sniffed) {
    throw new Error('Unrecognized file — supported background types are PNG, JPEG, WEBP, GIF, MP4, and WEBM.')
  }
  if (bytes.length > maxBytesFor(sniffed.kind)) {
    throw new Error(`That file is too large for a ${sniffed.kind} background.`)
  }

  await removeBackgroundAsset()
  const dir = assetsDir()
  await mkdir(dir, { recursive: true })
  const filename = `background.${sniffed.ext}`
  await writeFile(path.join(dir, filename), bytes)
  return filename
}

export async function removeBackgroundAsset(): Promise<void> {
  const dir = assetsDir()
  await Promise.all(BACKGROUND_EXTENSIONS.map((ext) => rm(path.join(dir, `background.${ext}`), { force: true })))
}

export async function readBackgroundAsset(filename: string): Promise<Buffer> {
  return readFile(path.join(assetsDir(), filename))
}

const MAX_FONT_BYTES = 5 * 1024 * 1024
const FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2']

function sniffFont(bytes: Buffer): string | null {
  if (startsWith(bytes, [0x00, 0x01, 0x00, 0x00])) return 'ttf'
  if (bytes.length >= 4 && ['true', 'ttcf'].includes(bytes.toString('ascii', 0, 4))) return 'ttf'
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'OTTO') return 'otf'
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'wOFF') return 'woff'
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'wOF2') return 'woff2'
  return null
}

export async function saveFontAsset(bytes: Buffer): Promise<string> {
  const ext = sniffFont(bytes)
  if (!ext) {
    throw new Error('Unrecognized file — supported font types are TTF, OTF, WOFF, and WOFF2.')
  }
  if (bytes.length > MAX_FONT_BYTES) {
    throw new Error('That font file is too large (max 5 MB).')
  }

  await removeFontAsset()
  const dir = assetsDir()
  await mkdir(dir, { recursive: true })
  const filename = `custom-font.${ext}`
  await writeFile(path.join(dir, filename), bytes)
  return filename
}

export async function removeFontAsset(): Promise<void> {
  const dir = assetsDir()
  await Promise.all(FONT_EXTENSIONS.map((ext) => rm(path.join(dir, `custom-font.${ext}`), { force: true })))
}

export async function readFontAsset(filename: string): Promise<Buffer> {
  return readFile(path.join(assetsDir(), filename))
}
