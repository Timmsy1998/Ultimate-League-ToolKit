import type { ActivityEntry, GameflowPhase, LcuSnapshot, RunePageSummary, MatchSummary, SummonerInfo } from '../shared/lcu-types'
import type { Settings } from '../shared/settings-types'

export interface LcuBridge {
  getSnapshot: () => Promise<LcuSnapshot>
  onStatus: (cb: (status: LcuSnapshot['status']) => void) => () => void
  onSummoner: (cb: (summoner: SummonerInfo | null) => void) => () => void
  onPhase: (cb: (phase: GameflowPhase) => void) => () => void
  onActivity: (cb: (activity: ActivityEntry[]) => void) => () => void
  getRunePages: () => Promise<RunePageSummary[]>
  getMatchHistory: () => Promise<MatchSummary[]>
}

export interface SettingsBridge {
  get: () => Promise<Settings>
  set: (partial: Partial<Settings>) => Promise<Settings>
}

export interface ThemeBridge {
  reportEffective: (value: 'dark' | 'light') => void
}

declare global {
  interface Window {
    api: {
      lcu: LcuBridge
      settings: SettingsBridge
      theme: ThemeBridge
    }
  }
}
