import type { RunePageSummary } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

interface RawRunePage {
  id: number
  name: string
  primaryStyleId: number
  subStyleId: number
  current?: boolean
}

interface RawStyle {
  id: number
  name: string
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

// Read-only: lists existing pages with their rune tree names. Creating or
// editing pages needs a full perk-tree picker UI — a separate feature.
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
