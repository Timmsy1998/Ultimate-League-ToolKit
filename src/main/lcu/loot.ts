import type { LootItem, LootSummary } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

interface RawLootItem {
  lootId?: unknown
  type?: unknown
  localizedName?: unknown
  count?: unknown
  disenchantValue?: unknown
  disenchantLootName?: unknown
  disenchantRecipeName?: unknown
  tilePath?: unknown
  assetPath?: unknown
}

function isRawLootItem(value: unknown): value is RawLootItem {
  return !!value && typeof value === 'object'
}

function toLootItem(raw: RawLootItem): LootItem | null {
  if (typeof raw.lootId !== 'string' || typeof raw.type !== 'string') return null
  if (typeof raw.localizedName !== 'string' || typeof raw.count !== 'number') return null

  return {
    lootId: raw.lootId,
    type: raw.type,
    localizedName: raw.localizedName,
    count: raw.count,
    disenchantValue: typeof raw.disenchantValue === 'number' ? raw.disenchantValue : null,
    disenchantLootName: typeof raw.disenchantLootName === 'string' ? raw.disenchantLootName : null,
    disenchantRecipeName: typeof raw.disenchantRecipeName === 'string' ? raw.disenchantRecipeName : null,
    iconPath:
      typeof raw.tilePath === 'string' ? raw.tilePath : typeof raw.assetPath === 'string' ? raw.assetPath : null
  }
}

// The LCU's loot-item shape is undocumented and has drifted across client
// versions — filter defensively (drop anything that doesn't match) rather
// than trusting every field, the same approach rune-pages.ts takes.
export async function fetchLoot(client: LcuHttpClient): Promise<LootSummary> {
  const raw = await client.get<unknown>('/lol-loot/v1/player-loot')
  const rawItems = Array.isArray(raw) ? raw.filter(isRawLootItem) : []

  const items = rawItems
    .filter((entry) => entry.type !== 'CURRENCY')
    .map(toLootItem)
    .filter((item): item is LootItem => item !== null)

  const currencies = rawItems
    .filter((entry) => entry.type === 'CURRENCY')
    .map((entry) => ({
      name: typeof entry.localizedName === 'string' ? entry.localizedName : 'Currency',
      count: typeof entry.count === 'number' ? entry.count : 0
    }))

  return { items, currencies }
}

// Crafting (disenchant, chest+key opening, etc.) is all the same LCU
// primitive underneath — a recipe name plus a set of ingredient loot IDs.
// The recipe name always comes from a field on a loot item the client
// already returned (fetchLoot), never guessed/hardcoded here.
async function craft(client: LcuHttpClient, recipeName: string, lootIds: string[]): Promise<LootSummary> {
  await client.post(`/lol-loot/v1/recipes/${encodeURIComponent(recipeName)}/craft?repeat=${lootIds.length}`, lootIds)
  return fetchLoot(client)
}

export function craftDisenchant(client: LcuHttpClient, recipeName: string, lootIds: string[]): Promise<LootSummary> {
  return craft(client, recipeName, lootIds)
}
