import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { findLcuCredentials } from './credentials'
import { LcuEventSocket } from './event-socket'
import { LcuHttpClient } from './http-client'
import { fetchAssetDataUri } from './assets'
import { fetchChampions } from './champions'
import { createLimiter } from './concurrency-limit'
import { fetchGameSession } from './game-session'
import { fetchRankedStats } from './ranked'
import { fetchRunePages, fetchPerkCatalog, importRunePage } from './rune-pages'
import { fetchMatchHistory } from './match-history'
import type {
  ActivityEntry,
  ChampionSummary,
  ConnectionStatus,
  GameflowPhase,
  GameSessionInfo,
  ImportRunePageRequest,
  ImportRunePageResult,
  LcuEvent,
  LcuSnapshot,
  PerkCatalog,
  RankedStats,
  RunePageSummary,
  MatchSummary,
  SummonerInfo
} from '../../shared/lcu-types'
import { isGameflowPhase, isSummonerInfo } from './validate'

const POLL_INTERVAL_MS = 3000
const FALLBACK_EVERY_N_TICKS = 4
const MAX_ACTIVITY_ENTRIES = 20

const PHASE_ACTIVITY_MESSAGES: Partial<Record<string, string>> = {
  Lobby: 'Entered a lobby',
  Matchmaking: 'Searching for a match',
  ReadyCheck: 'Ready check',
  ChampSelect: 'Entered champion select',
  InProgress: 'Game started',
  EndOfGame: 'Game ended'
}

export declare interface LcuConnectionManager {
  on(event: 'status', listener: (status: ConnectionStatus) => void): this
  on(event: 'summoner', listener: (summoner: SummonerInfo | null) => void): this
  on(event: 'phase', listener: (phase: GameflowPhase) => void): this
  on(event: 'activity', listener: (entries: ActivityEntry[]) => void): this
  on(event: 'connectedAt', listener: (connectedAt: number | null) => void): this
  on(event: 'ranked', listener: (ranked: RankedStats | null) => void): this
  on(event: 'gameSession', listener: (session: GameSessionInfo | null) => void): this
}

export class LcuConnectionManager extends EventEmitter {
  private status: ConnectionStatus = 'offline'
  private summoner: SummonerInfo | null = null
  private phase: GameflowPhase = 'None'
  private activity: ActivityEntry[] = []
  private connectedAt: number | null = null
  private ranked: RankedStats | null = null
  private gameSession: GameSessionInfo | null = null

  private pollTimer: NodeJS.Timeout | null = null
  private tick = 0
  private client: LcuHttpClient | null = null
  private socket: LcuEventSocket | null = null
  private stopped = true
  // Icons don't change within a running session — keyed by asset path, kept
  // for the lifetime of the app rather than cleared on reconnect.
  private readonly assetCache = new Map<string, string>()
  private readonly assetInflight = new Map<string, Promise<string>>()
  private readonly limitAssetFetch = createLimiter(6)

  start(): void {
    this.stopped = false
    this.schedulePoll(0)
  }

  stop(): void {
    this.stopped = true
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.socket?.close()
    this.socket = null
    this.client = null
  }

  getSnapshot(): LcuSnapshot {
    return {
      status: this.status,
      summoner: this.summoner,
      phase: this.phase,
      activity: this.activity,
      connectedAt: this.connectedAt,
      ranked: this.ranked,
      gameSession: this.gameSession
    }
  }

  getRunePages(): Promise<RunePageSummary[]> {
    if (!this.client) {
      return Promise.reject(new Error('Not connected to the League Client'))
    }
    return fetchRunePages(this.client)
  }

  getMatchHistory(count = 10): Promise<MatchSummary[]> {
    if (!this.client || !this.summoner) {
      return Promise.reject(new Error('Not connected to the League Client'))
    }
    return fetchMatchHistory(this.client, this.summoner.summonerId, count)
  }

  getPerkCatalog(): Promise<PerkCatalog> {
    if (!this.client) {
      return Promise.reject(new Error('Not connected to the League Client'))
    }
    return fetchPerkCatalog(this.client)
  }

  getChampions(): Promise<ChampionSummary[]> {
    if (!this.client) {
      return Promise.reject(new Error('Not connected to the League Client'))
    }
    return fetchChampions(this.client)
  }

  async getAsset(path: string): Promise<string> {
    if (!this.client) {
      return Promise.reject(new Error('Not connected to the League Client'))
    }
    const cached = this.assetCache.get(path)
    if (cached) return cached

    const inflight = this.assetInflight.get(path)
    if (inflight) return inflight

    const client = this.client
    const fetchPromise = this.limitAssetFetch(() => fetchAssetDataUri(client, path))
      .then((dataUri) => {
        this.assetCache.set(path, dataUri)
        return dataUri
      })
      .finally(() => {
        this.assetInflight.delete(path)
      })

    this.assetInflight.set(path, fetchPromise)
    return fetchPromise
  }

  importRunePage(request: ImportRunePageRequest): Promise<ImportRunePageResult> {
    if (!this.client) {
      return Promise.reject(new Error('Not connected to the League Client'))
    }
    return importRunePage(this.client, request)
  }

  private schedulePoll(delay: number): void {
    if (this.stopped) return
    this.pollTimer = setTimeout(() => void this.poll(), delay)
  }

  private async poll(): Promise<void> {
    this.tick += 1
    const useProcessFallback = this.tick % FALLBACK_EVERY_N_TICKS === 0
    const credentials = await findLcuCredentials(useProcessFallback)

    if (!credentials || this.stopped) {
      this.schedulePoll(POLL_INTERVAL_MS)
      return
    }

    this.setStatus('connecting')
    this.client = new LcuHttpClient(credentials)
    this.socket = new LcuEventSocket(credentials)

    this.socket.on('open', () => void this.onSocketOpen())
    this.socket.on('close', () => this.onSocketClose())
    this.socket.on('event', (event) => this.onEvent(event))
    this.socket.connect()
  }

  private async onSocketOpen(): Promise<void> {
    if (!this.client) return
    try {
      const [summoner, phase] = await Promise.all([
        this.client.get<unknown>('/lol-summoner/v1/current-summoner'),
        this.client.get<unknown>('/lol-gameflow/v1/gameflow-phase')
      ])
      this.setSummoner(isSummonerInfo(summoner) ? summoner : null)
      this.setPhase(isGameflowPhase(phase) ? phase : 'None')
      this.setStatus('online')
      this.setConnectedAt(Date.now())
      this.pushActivity('Connected to League Client')
      // setPhase() above already triggers a game-session refresh on every
      // call; ranked stats only need an explicit kick here since setPhase
      // only refreshes those for the None/Lobby phases.
      void this.refreshRanked()
    } catch {
      // Socket came up but the initial fetch failed — client is probably
      // still starting. Treat it the same as a dropped connection.
      this.onSocketClose()
    }
  }

  private onSocketClose(): void {
    this.socket = null
    this.client = null
    this.setStatus('offline')
    this.setSummoner(null)
    this.setPhase('None')
    this.setConnectedAt(null)
    this.setRanked(null)
    this.setGameSession(null)
    this.schedulePoll(POLL_INTERVAL_MS)
  }

  private onEvent(event: LcuEvent): void {
    if (event.uri === '/lol-summoner/v1/current-summoner' && isSummonerInfo(event.data)) {
      this.setSummoner(event.data)
    } else if (event.uri === '/lol-gameflow/v1/gameflow-phase' && isGameflowPhase(event.data)) {
      this.setPhase(event.data)
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return
    this.status = status
    this.emit('status', status)
  }

  private setSummoner(summoner: SummonerInfo | null): void {
    this.summoner = summoner
    this.emit('summoner', summoner)
  }

  private setPhase(phase: GameflowPhase): void {
    if (this.phase === phase) return
    this.phase = phase
    this.emit('phase', phase)
    const message = PHASE_ACTIVITY_MESSAGES[phase]
    if (message) this.pushActivity(message)

    void this.refreshGameSession()
    // Ranked LP only actually changes once a game finishes and the client
    // settles back at the menu/lobby — refetching on every phase change
    // would just repeat the same numbers.
    if (phase === 'None' || phase === 'Lobby') void this.refreshRanked()
  }

  private setRanked(ranked: RankedStats | null): void {
    this.ranked = ranked
    this.emit('ranked', ranked)
  }

  private setGameSession(session: GameSessionInfo | null): void {
    this.gameSession = session
    this.emit('gameSession', session)
  }

  private async refreshRanked(): Promise<void> {
    if (!this.client) return
    try {
      this.setRanked(await fetchRankedStats(this.client))
    } catch {
      this.setRanked(null)
    }
  }

  private async refreshGameSession(): Promise<void> {
    if (!this.client) return
    this.setGameSession(await fetchGameSession(this.client))
  }

  private setConnectedAt(connectedAt: number | null): void {
    if (this.connectedAt === connectedAt) return
    this.connectedAt = connectedAt
    this.emit('connectedAt', connectedAt)
  }

  private pushActivity(message: string): void {
    const entry: ActivityEntry = { id: randomUUID(), message, timestamp: Date.now() }
    this.activity = [entry, ...this.activity].slice(0, MAX_ACTIVITY_ENTRIES)
    this.emit('activity', this.activity)
  }
}
