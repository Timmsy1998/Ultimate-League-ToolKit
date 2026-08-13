import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
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

// Every exposed call is an explicit, typed channel — never a generic
// ipcRenderer passthrough. `on*` helpers return an unsubscribe function so
// renderer components can clean up on unmount.
//
// No @electron-toolkit/preload here: with sandbox: true (see
// src/main/index.ts), the preload script can only run fully self-contained
// code, and pulling in an external node_modules package here reintroduces
// that problem for no real benefit — we weren't using anything from it.
function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const lcu = {
  getSnapshot: (): Promise<LcuSnapshot> => ipcRenderer.invoke('lcu:get-snapshot'),
  onStatus: (cb: (status: LcuSnapshot['status']) => void) => subscribe('lcu:status', cb),
  onSummoner: (cb: (summoner: SummonerInfo | null) => void) => subscribe('lcu:summoner', cb),
  onPhase: (cb: (phase: GameflowPhase) => void) => subscribe('lcu:phase', cb),
  onActivity: (cb: (activity: ActivityEntry[]) => void) => subscribe('lcu:activity', cb),
  onConnectedAt: (cb: (connectedAt: number | null) => void) => subscribe('lcu:connected-at', cb),
  onRanked: (cb: (ranked: RankedStats | null) => void) => subscribe('lcu:ranked', cb),
  onGameSession: (cb: (session: GameSessionInfo | null) => void) => subscribe('lcu:game-session', cb),
  getRunePages: (): Promise<RunePageSummary[]> => ipcRenderer.invoke('lcu:get-rune-pages'),
  getMatchHistory: (): Promise<MatchSummary[]> => ipcRenderer.invoke('lcu:get-match-history'),
  getPerkCatalog: (): Promise<PerkCatalog> => ipcRenderer.invoke('lcu:get-perk-catalog'),
  getChampions: (): Promise<ChampionSummary[]> => ipcRenderer.invoke('lcu:get-champions'),
  getAsset: (path: string): Promise<string> => ipcRenderer.invoke('lcu:get-asset', path),
  importRunePage: (request: ImportRunePageRequest): Promise<ImportRunePageResult> =>
    ipcRenderer.invoke('lcu:import-rune-page', request),
  leaveLobby: (): Promise<void> => ipcRenderer.invoke('lcu:leave-lobby'),
  getLoot: (): Promise<LootSummary> => ipcRenderer.invoke('lcu:get-loot'),
  disenchantLoot: (request: DisenchantRequest): Promise<LootSummary> =>
    ipcRenderer.invoke('lcu:disenchant-loot', request),
  getFriends: (): Promise<FriendSummary[]> => ipcRenderer.invoke('lcu:get-friends'),
  getFriendGroups: (): Promise<FriendGroup[]> => ipcRenderer.invoke('lcu:get-friend-groups'),
  inviteFriends: (request: InviteFriendsRequest): Promise<void> =>
    ipcRenderer.invoke('lcu:invite-friends', request)
}

const settings = {
  get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  set: (partial: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:set', partial)
}

const runeBook = {
  get: (): Promise<RuneBook> => ipcRenderer.invoke('rune-book:get'),
  savePage: (page: RuneBookPage): Promise<RuneBook> => ipcRenderer.invoke('rune-book:save-page', page),
  deletePage: (id: string): Promise<RuneBook> => ipcRenderer.invoke('rune-book:delete-page', id)
}

const rankHistory = {
  get: (): Promise<RankHistory> => ipcRenderer.invoke('rank-history:get')
}

const theme = {
  // Fire-and-forget: lets main keep the native titlebar overlay in sync
  // with the resolved (post-'system') theme. No response expected.
  reportEffective: (value: 'dark' | 'light'): void => {
    ipcRenderer.send('theme:effective-changed', value)
  }
}

// Distinct from `theme` above — this is the League Client reskin feature
// (CLAUDE.md §5a), not ULTK's own dark/light appearance.
const clientTheme = {
  apply: (): Promise<void> => ipcRenderer.invoke('client-theme:apply')
}

const updater = {
  getState: (): Promise<UpdaterState> => ipcRenderer.invoke('update:get-state'),
  onState: (cb: (state: UpdaterState) => void) => subscribe('update:state', cb),
  check: (): Promise<void> => ipcRenderer.invoke('update:check'),
  // Fire-and-forget: quits and relaunches the app, so no response is ever
  // going to arrive on this channel.
  install: (): void => {
    ipcRenderer.send('update:install')
  }
}

const appInfo = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version')
}

const api = { lcu, settings, runeBook, rankHistory, theme, clientTheme, updater, app: appInfo }

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error contextIsolation is always on; this branch only runs
  // if that invariant is ever broken, and TS shouldn't assume window.api.
  window.api = api
}
