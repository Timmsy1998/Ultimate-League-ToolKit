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
}

export interface RunePageSummary {
  id: number
  name: string
  current: boolean
  primaryStyleName: string
  subStyleName: string
export interface MatchSummary {
  gameId: number
  queueType: string
  // null when the response didn't let us confidently match the current
  // summoner to a participant — shown as "unknown" rather than guessed.
  win: boolean | null
  durationSeconds: number
  playedAt: number
}
