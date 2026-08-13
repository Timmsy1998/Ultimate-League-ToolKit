import type {
  ActivityEntry,
  ChampionSummary,
  DisenchantRequest,
  FriendGroup,
  FriendSummary,
  GameflowPhase,
  GameSessionInfo,
  ImportRunePageRequest,
  ImportRunePageResult,
  InviteFriendsRequest,
  LcuSnapshot,
  LootSummary,
  PerkCatalog,
  RankedStats,
  RunePageSummary,
  MatchSummary,
  SummonerInfo
} from '../shared/lcu-types'
import type { RankHistory } from '../shared/rank-history-types'
import type { RuneBook, RuneBookPage } from '../shared/rune-book-types'
import type { Settings } from '../shared/settings-types'
import type { UpdaterState } from '../shared/updater-types'

export interface LcuBridge {
  getSnapshot: () => Promise<LcuSnapshot>
  onStatus: (cb: (status: LcuSnapshot['status']) => void) => () => void
  onSummoner: (cb: (summoner: SummonerInfo | null) => void) => () => void
  onPhase: (cb: (phase: GameflowPhase) => void) => () => void
  onActivity: (cb: (activity: ActivityEntry[]) => void) => () => void
  onConnectedAt: (cb: (connectedAt: number | null) => void) => () => void
  onRanked: (cb: (ranked: RankedStats | null) => void) => () => void
  onGameSession: (cb: (session: GameSessionInfo | null) => void) => () => void
  getRunePages: () => Promise<RunePageSummary[]>
  getMatchHistory: () => Promise<MatchSummary[]>
  getPerkCatalog: () => Promise<PerkCatalog>
  getChampions: () => Promise<ChampionSummary[]>
  getAsset: (path: string) => Promise<string>
  importRunePage: (request: ImportRunePageRequest) => Promise<ImportRunePageResult>
  leaveLobby: () => Promise<void>
  getLoot: () => Promise<LootSummary>
  disenchantLoot: (request: DisenchantRequest) => Promise<LootSummary>
  getFriends: () => Promise<FriendSummary[]>
  getFriendGroups: () => Promise<FriendGroup[]>
  inviteFriends: (request: InviteFriendsRequest) => Promise<void>
}

export interface SettingsBridge {
  get: () => Promise<Settings>
  set: (partial: Partial<Settings>) => Promise<Settings>
}

export interface RuneBookBridge {
  get: () => Promise<RuneBook>
  savePage: (page: RuneBookPage) => Promise<RuneBook>
  deletePage: (id: string) => Promise<RuneBook>
}

export interface RankHistoryBridge {
  get: () => Promise<RankHistory>
}

export interface ThemeBridge {
  reportEffective: (value: 'dark' | 'light') => void
}

export interface ClientThemeBridge {
  apply: () => Promise<void>
  enable: () => Promise<void>
  disable: () => Promise<void>
  status: () => Promise<boolean>
}

export interface UpdaterBridge {
  getState: () => Promise<UpdaterState>
  onState: (cb: (state: UpdaterState) => void) => () => void
  check: () => Promise<void>
  install: () => void
}

export interface AppInfoBridge {
  getVersion: () => Promise<string>
}

declare global {
  interface Window {
    api: {
      lcu: LcuBridge
      settings: SettingsBridge
      runeBook: RuneBookBridge
      rankHistory: RankHistoryBridge
      theme: ThemeBridge
      clientTheme: ClientThemeBridge
      updater: UpdaterBridge
      app: AppInfoBridge
    }
  }
}
