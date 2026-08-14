import type {
  EditableRunePage,
  ImportRunePageRequest,
  ImportRunePageResult,
  PerkCatalog,
  RunePageDetail,
  RunePageSummary,
  RunePerk,
  RuneStyle
} from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

interface RawRunePage {
  id: number
  name: string
  primaryStyleId: number
  subStyleId: number
  current?: boolean
  isEditable?: boolean
  selectedPerkIds?: number[]
}

interface RawStyleSlot {
  type?: string
  perks?: number[]
}

interface RawStyle {
  id: number
  name: string
  iconPath?: string
  allowedSubStyles?: number[]
  slots?: RawStyleSlot[]
}

interface RawPerk {
  id: number
  name: string
  iconPath?: string
}

function isRawRunePage(value: unknown): value is RawRunePage {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'number' &&
    typeof v.name === 'string' &&
    typeof v.primaryStyleId === 'number' &&
    typeof v.subStyleId === 'number'
  )
}

function isRawStyle(value: unknown): value is RawStyle {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'number' && typeof v.name === 'string'
}

function isRawPerk(value: unknown): value is RawPerk {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'number' && typeof v.name === 'string'
}

// Read-only: lists existing pages with their rune tree names. Building/
// editing a full selection lives in fetchPerkCatalog + createClientRunePage/
// updateClientRunePage below.
export async function fetchRunePages(client: LcuHttpClient): Promise<RunePageSummary[]> {
  const [rawPages, rawStyles] = await Promise.all([
    client.get<unknown>('/lol-perks/v1/pages'),
    client.get<unknown>('/lol-perks/v1/styles')
  ])

  if (!Array.isArray(rawPages) || !Array.isArray(rawStyles)) return []

  const styleNames = new Map<number, string>()
  for (const style of rawStyles) {
    if (isRawStyle(style)) styleNames.set(style.id, style.name)
  }

  const pages: RunePageSummary[] = []
  for (const page of rawPages) {
    if (!isRawRunePage(page)) continue
    pages.push({
      id: page.id,
      name: page.name,
      current: page.current === true,
      primaryStyleName: styleNames.get(page.primaryStyleId) ?? 'Unknown',
      subStyleName: styleNames.get(page.subStyleId) ?? 'Unknown'
    })
  }

  return pages
}

export async function fetchEditableRunePages(client: LcuHttpClient): Promise<EditableRunePage[]> {
  const rawPages = await client.get<unknown>('/lol-perks/v1/pages')
  if (!Array.isArray(rawPages)) return []

  return rawPages
    .filter(isRawRunePage)
    .filter((page) => page.isEditable !== false)
    .map((page) => ({ id: page.id, name: page.name, isEditable: page.isEditable !== false }))
}

// Full pages, for pulling a page *out* of the client into the rune book.
// Only pages with a complete 9-perk selection are usable — a page the
// client itself hasn't fully filled in yet can't be reconstructed into a
// valid RuneSelection, so it's silently dropped here rather than surfaced
// as a broken pull target.
export async function fetchRunePageDetails(client: LcuHttpClient): Promise<RunePageDetail[]> {
  const rawPages = await client.get<unknown>('/lol-perks/v1/pages')
  if (!Array.isArray(rawPages)) return []

  return rawPages
    .filter(isRawRunePage)
    .filter((page) => Array.isArray(page.selectedPerkIds) && page.selectedPerkIds.length === 9)
    .map((page) => ({
      id: page.id,
      name: page.name,
      current: page.current === true,
      primaryStyleId: page.primaryStyleId,
      subStyleId: page.subStyleId,
      selectedPerkIds: page.selectedPerkIds as number[]
    }))
}

// Each of the 5 real trees carries its own keystone slot (type kKeyStone)
// and 3 perk-row slots, plus — confirmed against a live client — the same 3
// universal stat-shard rows (type kStatMod) duplicated onto every style.
// Only the shard IDs, never their row grouping, would otherwise need
// hardcoding; pulling them from here means nothing about shards is assumed.
function isValidSlot(slot: RawStyleSlot): slot is { type: string; perks: number[] } {
  return typeof slot.type === 'string' && Array.isArray(slot.perks)
}

export async function fetchPerkCatalog(client: LcuHttpClient): Promise<PerkCatalog> {
  const [rawStyles, rawPerks] = await Promise.all([
    client.get<unknown>('/lol-perks/v1/styles'),
    client.get<unknown>('/lol-perks/v1/perks')
  ])

  const perks: Record<number, RunePerk> = {}
  if (Array.isArray(rawPerks)) {
    for (const perk of rawPerks) {
      if (!isRawPerk(perk)) continue
      perks[perk.id] = { id: perk.id, name: perk.name, iconPath: perk.iconPath ?? '' }
    }
  }

  const styles: RuneStyle[] = []
  let statShards: { offense: number[]; flex: number[]; defense: number[] } | null = null

  if (Array.isArray(rawStyles)) {
    for (const style of rawStyles) {
      if (!isRawStyle(style) || !Array.isArray(style.slots)) continue
      const validSlots = style.slots.filter(isValidSlot)

      const keystoneSlot = validSlots.find((slot) => slot.type === 'kKeyStone')
      const standardSlots = validSlots.filter((slot) => slot.type !== 'kKeyStone' && slot.type !== 'kStatMod')
      if (!keystoneSlot && standardSlots.length === 0) continue

      styles.push({
        id: style.id,
        name: style.name,
        iconPath: style.iconPath ?? '',
        allowedSubStyles: Array.isArray(style.allowedSubStyles) ? style.allowedSubStyles : [],
        slots: [...(keystoneSlot ? [keystoneSlot] : []), ...standardSlots].map((slot) => ({
          type: slot.type,
          perkIds: slot.perks
        }))
      })

      if (!statShards) {
        const statModSlots = validSlots.filter((slot) => slot.type === 'kStatMod')
        if (statModSlots.length === 3) {
          statShards = { offense: statModSlots[0].perks, flex: statModSlots[1].perks, defense: statModSlots[2].perks }
        }
      }
    }
  }

  return {
    styles,
    perks,
    statShards: statShards ?? { offense: [], flex: [], defense: [] }
  }
}

function buildPageBody(request: ImportRunePageRequest): Record<string, unknown> {
  return {
    name: request.name,
    primaryStyleId: request.primaryStyleId,
    subStyleId: request.subStyleId,
    selectedPerkIds: request.selectedPerkIds
  }
}

// Import always tries to create a brand-new client page first. The LCU
// rejects creation once the account's editable-page limit is reached —
// that failure is treated as expected, not an error to log, and the caller
// gets back the current editable pages so the UI can offer to overwrite
// one of them instead.
export async function importRunePage(
  client: LcuHttpClient,
  request: ImportRunePageRequest
): Promise<ImportRunePageResult> {
  if (request.overwritePageId !== undefined) {
    try {
      await client.put(`/lol-perks/v1/pages/${request.overwritePageId}`, buildPageBody(request))
      return { ok: true, overwritten: true }
    } catch (err) {
      return { ok: false, overwritten: false, error: (err as Error).message }
    }
  }

  try {
    await client.post('/lol-perks/v1/pages', buildPageBody(request))
    return { ok: true, overwritten: false }
  } catch (err) {
    const editablePages = await fetchEditableRunePages(client).catch(() => [])
    return { ok: false, overwritten: false, error: (err as Error).message, editablePages }
  }
}
