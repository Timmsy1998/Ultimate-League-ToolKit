import type { PerkCatalog } from '../../../../shared/lcu-types'
import type { RuneSelection } from '../../../../shared/rune-book-types'

// Inverse of what RuneEditor does when building a selection by hand: given
// the flat selectedPerkIds list the LCU itself returns for a page, sort
// each id back into its row using the same catalog slot data RuneEditor
// already reads from (primary style's keystone/perk rows, sub style's perk
// rows, and the three global stat-shard rows). Returns null if the page
// doesn't cleanly map — a style that's changed since the page was last
// saved in-client, for instance.
export function classifySelectedPerkIds(
  catalog: PerkCatalog,
  primaryStyleId: number,
  subStyleId: number,
  selectedPerkIds: number[]
): RuneSelection | null {
  const primaryStyle = catalog.styles.find((s) => s.id === primaryStyleId)
  const subStyle = catalog.styles.find((s) => s.id === subStyleId)
  if (!primaryStyle || !subStyle) return null

  const remaining = new Set(selectedPerkIds)
  const take = (perkIds: number[]): number | null => {
    const match = perkIds.find((id) => remaining.has(id))
    if (match === undefined) return null
    remaining.delete(match)
    return match
  }

  const keystoneId = take(primaryStyle.slots[0]?.perkIds ?? [])
  if (keystoneId === null) return null

  const primaryPerkIds = primaryStyle.slots.slice(1).map((slot) => take(slot.perkIds))
  if (primaryPerkIds.some((id) => id === null) || primaryPerkIds.length !== 3) return null

  const subPerkIds: number[] = []
  for (const slot of subStyle.slots.slice(1)) {
    const match = take(slot.perkIds)
    if (match !== null) subPerkIds.push(match)
  }
  if (subPerkIds.length !== 2) return null

  // Stat-shard rows share several perk ids across rows (Adaptive Force is a
  // valid pick in both the offense and flex rows; Armor/Magic Resist in
  // both flex and defense), so the same greedy take() used above can steal
  // an id for the wrong row and leave a valid page unmatched. The LCU
  // always returns selectedPerkIds in fixed slot order though, so the last
  // three entries are the offense/flex/defense picks positionally — read
  // them by position and just confirm each is legal for its row.
  const shardIds = selectedPerkIds.slice(-3)
  const shardRows = [catalog.statShards.offense, catalog.statShards.flex, catalog.statShards.defense]
  const statShardIds = shardIds.map((id, i) => (shardRows[i].includes(id) ? id : null))
  if (statShardIds.length !== 3 || statShardIds.some((id) => id === null)) return null

  return {
    keystoneId,
    primaryPerkIds: primaryPerkIds as [number, number, number],
    subPerkIds: subPerkIds as [number, number],
    statShardIds: statShardIds as [number, number, number]
  }
}
