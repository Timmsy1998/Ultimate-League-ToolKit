import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { EMPTY_RUNE_BOOK, type RuneBook, type RuneBookPage, type RuneSelection } from '../../shared/rune-book-types'

const WRITE_DEBOUNCE_MS = 250
const MAX_NAME_LENGTH = 100

let cached: RuneBook | null = null
let writeTimer: NodeJS.Timeout | null = null

function getBookPath(): string {
  return path.join(app.getPath('userData'), 'rune-book.json')
}

function isNumberTriple(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number')
}

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number')
}

function isRuneSelection(value: unknown): value is RuneSelection {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.keystoneId === 'number' &&
    isNumberTriple(v.primaryPerkIds) &&
    isNumberPair(v.subPerkIds) &&
    isNumberTriple(v.statShardIds)
  )
}

// Renderer-originated input — never trust the shape, reject anything that
// doesn't match a well-formed page rather than silently coercing it.
function isRuneBookPage(value: unknown): value is RuneBookPage {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.name === 'string' &&
    v.name.length > 0 &&
    v.name.length <= MAX_NAME_LENGTH &&
    (v.championId === null || typeof v.championId === 'number') &&
    (v.championName === null || typeof v.championName === 'string') &&
    typeof v.primaryStyleId === 'number' &&
    typeof v.subStyleId === 'number' &&
    isRuneSelection(v.selection) &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number'
  )
}

function isRuneBook(value: unknown): value is RuneBook {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.pages) && v.pages.every(isRuneBookPage)
}

export async function readBook(): Promise<RuneBook> {
  if (cached) return cached

  try {
    const raw = await readFile(getBookPath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    cached = isRuneBook(parsed) ? parsed : { ...EMPTY_RUNE_BOOK }
  } catch {
    cached = { ...EMPTY_RUNE_BOOK }
  }

  return cached
}

export async function savePage(page: unknown): Promise<RuneBook> {
  const current = await readBook()
  if (!isRuneBookPage(page)) return current

  const withoutExisting = current.pages.filter((p) => p.id !== page.id)
  cached = { pages: [...withoutExisting, page] }
  schedulePersist()
  return cached
}

export async function deletePage(id: unknown): Promise<RuneBook> {
  const current = await readBook()
  if (typeof id !== 'string') return current

  cached = { pages: current.pages.filter((p) => p.id !== id) }
  schedulePersist()
  return cached
}

function schedulePersist(): void {
  if (!cached) return
  if (writeTimer) clearTimeout(writeTimer)
  const toPersist = cached
  writeTimer = setTimeout(() => {
    void persist(toPersist)
  }, WRITE_DEBOUNCE_MS)
}

async function persist(book: RuneBook): Promise<void> {
  const target = getBookPath()
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(book, null, 2), 'utf-8')
}
