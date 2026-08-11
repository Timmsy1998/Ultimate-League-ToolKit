import type { SummonerInfo } from '../../shared/lcu-types'

export function isSummonerInfo(value: unknown): value is SummonerInfo {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.summonerId === 'number' &&
    typeof v.displayName === 'string' &&
    typeof v.summonerLevel === 'number' &&
    typeof v.profileIconId === 'number'
  )
}

export function isGameflowPhase(value: unknown): value is string {
  return typeof value === 'string'
}
