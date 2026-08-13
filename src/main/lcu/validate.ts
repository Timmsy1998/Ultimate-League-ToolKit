import type { DisenchantRequest, ImportRunePageRequest, SummonerInfo } from '../../shared/lcu-types'

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

const MAX_RUNE_PAGE_NAME_LENGTH = 100

// The renderer only ever needs plugin-resource assets (champion/perk
// icons) proxied through here — allowing any other path would turn this
// channel into a general-purpose authenticated LCU GET proxy.
export function isAllowedAssetPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/lol-game-data/assets/')
}

export function isImportRunePageRequest(value: unknown): value is ImportRunePageRequest {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    v.name.length > 0 &&
    v.name.length <= MAX_RUNE_PAGE_NAME_LENGTH &&
    (v.championId === null || typeof v.championId === 'number') &&
    typeof v.primaryStyleId === 'number' &&
    typeof v.subStyleId === 'number' &&
    Array.isArray(v.selectedPerkIds) &&
    v.selectedPerkIds.length === 9 &&
    v.selectedPerkIds.every((id) => typeof id === 'number') &&
    (v.overwritePageId === undefined || typeof v.overwritePageId === 'number')
  )
}

// Bounds the batch size so this channel can't be used to send an
// arbitrarily large crafting request in one call.
const MAX_LOOT_IDS = 50

export function isDisenchantRequest(value: unknown): value is DisenchantRequest {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.recipeName === 'string' &&
    v.recipeName.length > 0 &&
    Array.isArray(v.lootIds) &&
    v.lootIds.length > 0 &&
    v.lootIds.length <= MAX_LOOT_IDS &&
    v.lootIds.every((id) => typeof id === 'string')
  )
}
