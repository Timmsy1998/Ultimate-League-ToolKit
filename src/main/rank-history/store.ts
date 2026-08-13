import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  EMPTY_RANK_HISTORY,
  type RankHistory,
  type RankSnapshot,
  type RankedQueueId
} from '../../shared/rank-history-types'

const WRITE_DEBOUNCE_MS = 250

let cached: RankHistory | null = null
let writeTimer: NodeJS.Timeout | null = null

function getHistoryPath(): string {
  return path.join(app.getPath('userData'), 'rank-history.json')
}

function isRankSnapshot(value: unknown): value is RankSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.timestamp === 'number' &&
    typeof v.tier === 'string' &&
    typeof v.division === 'string' &&
    typeof v.leaguePoints === 'number' &&
    typeof v.wins === 'number' &&
    typeof v.losses === 'number'
  )
}

function isRankHistory(value: unknown): value is RankHistory {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.soloDuo) &&
    v.soloDuo.every(isRankSnapshot) &&
    Array.isArray(v.flex) &&
    v.flex.every(isRankSnapshot)
  )
}

export async function readHistory(): Promise<RankHistory> {
  if (cached) return cached

  try {
    const raw = await readFile(getHistoryPath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    cached = isRankHistory(parsed) ? parsed : { ...EMPTY_RANK_HISTORY }
  } catch {
    cached = { ...EMPTY_RANK_HISTORY }
  }

  return cached
}

// Main-process-originated only (never called with renderer input directly),
// but validated anyway since a malformed snapshot here would silently
// corrupt every future chart render.
export async function appendSnapshot(queue: RankedQueueId, snapshot: unknown): Promise<RankHistory> {
  const current = await readHistory()
  if (!isRankSnapshot(snapshot)) return current

  cached = { ...current, [queue]: [...current[queue], snapshot] }
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

async function persist(history: RankHistory): Promise<void> {
  const target = getHistoryPath()
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(history, null, 2), 'utf-8')
}
