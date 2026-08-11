import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { findLcuCredentials } from './credentials'
import { LcuEventSocket } from './event-socket'
import { LcuHttpClient } from './http-client'
import { fetchRunePages } from './rune-pages'
import type {
  ActivityEntry,
  ConnectionStatus,
  GameflowPhase,
  LcuEvent,
  LcuSnapshot,
  RunePageSummary,
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
}

export class LcuConnectionManager extends EventEmitter {
  private status: ConnectionStatus = 'offline'
  private summoner: SummonerInfo | null = null
  private phase: GameflowPhase = 'None'
  private activity: ActivityEntry[] = []

  private pollTimer: NodeJS.Timeout | null = null
  private tick = 0
  private client: LcuHttpClient | null = null
  private socket: LcuEventSocket | null = null
  private stopped = true

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
      activity: this.activity
    }
  }

  getRunePages(): Promise<RunePageSummary[]> {
    if (!this.client) {
      return Promise.reject(new Error('Not connected to the League Client'))
    }
    return fetchRunePages(this.client)
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
      this.pushActivity('Connected to League Client')
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
  }

  private pushActivity(message: string): void {
    const entry: ActivityEntry = { id: randomUUID(), message, timestamp: Date.now() }
    this.activity = [entry, ...this.activity].slice(0, MAX_ACTIVITY_ENTRIES)
    this.emit('activity', this.activity)
  }
}
