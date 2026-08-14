export interface LcuCredentials {
  port: number
  password: string
}

export type ConnectionStatus = 'offline' | 'connecting' | 'online'

export interface SummonerInfo {
  summonerId: number
  displayName: string
  summonerLevel: number
  profileIconId: number
}

export type GameflowPhase =
  | 'None'
  | 'Lobby'
  | 'Matchmaking'
  | 'CheckedIntoTournament'
  | 'ReadyCheck'
  | 'ChampSelect'
  | 'GameStart'
  | 'FailedToLaunch'
  | 'InProgress'
  | 'Reconnect'
  | 'WaitingForStats'
  | 'PreEndOfGame'
  | 'EndOfGame'
  | 'TerminatedInError'
  | (string & {})

export interface ActivityEntry {
  id: string
  message: string
  timestamp: number
}

export interface LcuEvent {
  uri: string
  eventType: 'Create' | 'Update' | 'Delete'
  data: unknown
}

export interface RankedEntry {
  tier: string
  division: string
  leaguePoints: number
  wins: number
  losses: number
  isProvisional: boolean
}

export interface RankedStats {
  soloDuo: RankedEntry | null
  flex: RankedEntry | null
}

export interface GameSessionInfo {
  queueName: string
  gameMode: string
  mapName: string
}

export interface LcuSnapshot {
  status: ConnectionStatus
  summoner: SummonerInfo | null
  phase: GameflowPhase
  activity: ActivityEntry[]
  connectedAt: number | null
  ranked: RankedStats | null
  gameSession: GameSessionInfo | null
}

export interface RunePageSummary {
  id: number
  name: string
  current: boolean
  primaryStyleName: string
  subStyleName: string
}

export interface RunePerk {
  id: number
  name: string
  iconPath: string
}

export interface RuneStyleSlot {
  type: string
  perkIds: number[]
}

export interface RuneStyle {
  id: number
  name: string
  iconPath: string
  slots: RuneStyleSlot[]
  allowedSubStyles: number[]
}

export interface StatShardRows {
  offense: number[]
  flex: number[]
  defense: number[]
}

export interface PerkCatalog {
  styles: RuneStyle[]
  perks: Record<number, RunePerk>
  statShards: StatShardRows
}

export interface ChampionSummary {
  id: number
  name: string
  alias: string
  squarePortraitPath: string
}

// Existing client rune page, as needed for the "overwrite" import flow —
// unlike RunePageSummary this carries whether the page can be written to.
export interface EditableRunePage {
  id: number
  name: string
  isEditable: boolean
}

// Full client rune page, as needed to pull a page *into* the rune book —
// unlike RunePageSummary (display-only names) this carries everything
// needed to reconstruct a RuneSelection: the raw style ids and the flat
// selected-perk-id list the LCU itself uses.
export interface RunePageDetail {
  id: number
  name: string
  current: boolean
  primaryStyleId: number
  subStyleId: number
  selectedPerkIds: number[]
}

export interface ImportRunePageRequest {
  name: string
  championId: number | null
  primaryStyleId: number
  subStyleId: number
  selectedPerkIds: number[]
  overwritePageId?: number
}

export interface ImportRunePageResult {
  ok: boolean
  overwritten: boolean
  error?: string
  editablePages?: EditableRunePage[]
}

export interface MatchSummary {
  gameId: number
  queueType: string
  // null when the response didn't let us confidently match the current
  // summoner to a participant — shown as "unknown" rather than guessed.
  win: boolean | null
  durationSeconds: number
  playedAt: number
}

export interface LootItem {
  lootId: string
  type: string
  localizedName: string
  count: number
  disenchantValue: number | null
  disenchantLootName: string | null
  // Crafting (disenchant, chest+key opening) always needs a recipe name —
  // it comes from the client itself rather than being guessed here, since
  // LCU recipe naming is undocumented and has changed between versions.
  disenchantRecipeName: string | null
  iconPath: string | null
}

export interface LootSummary {
  items: LootItem[]
  currencies: { name: string; count: number }[]
}

export interface DisenchantRequest {
  recipeName: string
  lootIds: string[]
}

export interface FriendGroup {
  id: string
  name: string
}

export interface FriendSummary {
  summonerId: number
  name: string
  groupId: string
  availability: string // 'chat' | 'away' | 'dnd' | 'mobile' | 'offline' | 'onlineelsewhere' | ...
}

export interface InviteFriendsRequest {
  summonerIds: number[]
}
