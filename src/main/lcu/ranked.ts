import type { RankedEntry, RankedStats } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

interface RawQueueEntry {
  tier?: string
  division?: string
  leaguePoints?: number
  wins?: number
  losses?: number
  isProvisional?: boolean
}

interface RawRankedStats {
  queueMap?: Record<string, RawQueueEntry>
}

function isRawRankedStats(value: unknown): value is RawRankedStats {
  return !!value && typeof value === 'object'
}

function toEntry(raw: RawQueueEntry | undefined): RankedEntry | null {
  if (!raw) return null
  return {
    tier: typeof raw.tier === 'string' ? raw.tier : '',
    division: typeof raw.division === 'string' ? raw.division : '',
    leaguePoints: typeof raw.leaguePoints === 'number' ? raw.leaguePoints : 0,
    wins: typeof raw.wins === 'number' ? raw.wins : 0,
    losses: typeof raw.losses === 'number' ? raw.losses : 0,
    isProvisional: raw.isProvisional === true
  }
}

export async function fetchRankedStats(client: LcuHttpClient): Promise<RankedStats> {
  const raw = await client.get<unknown>('/lol-ranked/v1/current-ranked-stats')
  if (!isRawRankedStats(raw)) return { soloDuo: null, flex: null }

  return {
    soloDuo: toEntry(raw.queueMap?.['RANKED_SOLO_5x5']),
    flex: toEntry(raw.queueMap?.['RANKED_FLEX_SR'])
  }
}
