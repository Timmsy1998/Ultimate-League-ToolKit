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

export interface LcuSnapshot {
  status: ConnectionStatus
  summoner: SummonerInfo | null
  phase: GameflowPhase
  activity: ActivityEntry[]
  connectedAt: number | null
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
