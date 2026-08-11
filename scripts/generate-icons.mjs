import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = path.resolve(import.meta.dirname, '..')
const svgPath = path.join(root, 'build', 'icon.svg')
const outDir = path.join(root, 'build', 'icons')
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]

async function main() {
  await mkdir(outDir, { recursive: true })
  const svg = await readFile(svgPath)

  const pngBuffers = {}
  for (const size of sizes) {
    const buf = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
    pngBuffers[size] = buf
    await writeFile(path.join(outDir, `${size}.png`), buf)
  }

  // Windows .ico bundles a handful of representative sizes into one file.
  const icoBuffer = await pngToIco([
    pngBuffers[16],
    pngBuffers[32],
    pngBuffers[48],
    pngBuffers[256]
  ])
  await writeFile(path.join(root, 'build', 'icon.ico'), icoBuffer)

  // electron-builder also wants a flat, high-res PNG as the canonical icon.
  await writeFile(path.join(root, 'build', 'icon.png'), pngBuffers[512])

  console.log(`Generated ${sizes.length} PNG sizes, icon.ico, and icon.png in build/`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
