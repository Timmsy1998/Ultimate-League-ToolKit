import type { ChampionSummary } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

export async function fetchChampions(client: LcuHttpClient): Promise<ChampionSummary[]> {
  const raw = await client.get<unknown>('/lol-game-data/assets/v1/champion-summary.json')
  if (!Array.isArray(raw)) return []

  const champions: ChampionSummary[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const v = entry as Record<string, unknown>
    // id -1 is the client's own "None" placeholder entry, not a champion.
    if (typeof v.id !== 'number' || v.id < 0) continue
    if (typeof v.name !== 'string' || typeof v.alias !== 'string') continue
    // League Classic entries (not the mainline roster) — excluded rather
    // than shown as a pickable champion.
    if (v.name.toLowerCase().includes('jade') || v.alias.toLowerCase().includes('jade')) continue
    champions.push({
      id: v.id,
      name: v.name,
      alias: v.alias,
      squarePortraitPath: typeof v.squarePortraitPath === 'string' ? v.squarePortraitPath : ''
    })
  }

  return champions.sort((a, b) => a.name.localeCompare(b.name))
}
