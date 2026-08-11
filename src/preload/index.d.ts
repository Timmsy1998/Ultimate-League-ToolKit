import type { ActivityEntry, GameflowPhase, LcuSnapshot, SummonerInfo } from '../shared/lcu-types'

export interface LcuBridge {
  getSnapshot: () => Promise<LcuSnapshot>
  onStatus: (cb: (status: LcuSnapshot['status']) => void) => () => void
  onSummoner: (cb: (summoner: SummonerInfo | null) => void) => () => void
  onPhase: (cb: (phase: GameflowPhase) => void) => () => void
  onActivity: (cb: (activity: ActivityEntry[]) => void) => () => void
}

declare global {
  interface Window {
    api: {
      lcu: LcuBridge
    }
  }
}
