export interface RuneSelection {
  keystoneId: number
  primaryPerkIds: [number, number, number]
  subPerkIds: [number, number]
  statShardIds: [number, number, number]
}

export interface RuneBookPage {
  id: string
  name: string
  championId: number | null
  championName: string | null
  primaryStyleId: number
  subStyleId: number
  selection: RuneSelection
  createdAt: number
  updatedAt: number
}

export interface RuneBook {
  pages: RuneBookPage[]
}

export const EMPTY_RUNE_BOOK: RuneBook = { pages: [] }
