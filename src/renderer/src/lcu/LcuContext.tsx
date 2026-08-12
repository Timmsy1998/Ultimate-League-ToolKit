import { createContext, useContext, useEffect, useState } from 'react'
import type {
  ActivityEntry,
  ConnectionStatus,
  GameflowPhase,
  GameSessionInfo,
  RankedStats,
  SummonerInfo
} from '../../../shared/lcu-types'

interface LcuState {
  status: ConnectionStatus
  summoner: SummonerInfo | null
  phase: GameflowPhase
  activity: ActivityEntry[]
  connectedAt: number | null
  ranked: RankedStats | null
  gameSession: GameSessionInfo | null
}

const INITIAL_STATE: LcuState = {
  status: 'offline',
  summoner: null,
  phase: 'None',
  activity: [],
  connectedAt: null,
  ranked: null,
  gameSession: null
}

const LcuStateContext = createContext<LcuState>(INITIAL_STATE)

export function LcuProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<LcuState>(INITIAL_STATE)

  useEffect(() => {
    let cancelled = false

    window.api.lcu.getSnapshot().then((snapshot) => {
      if (!cancelled) setState(snapshot)
    })

    const unsubscribers = [
      window.api.lcu.onStatus((status) => setState((s) => ({ ...s, status }))),
      window.api.lcu.onSummoner((summoner) => setState((s) => ({ ...s, summoner }))),
      window.api.lcu.onPhase((phase) => setState((s) => ({ ...s, phase }))),
      window.api.lcu.onActivity((activity) => setState((s) => ({ ...s, activity }))),
      window.api.lcu.onConnectedAt((connectedAt) => setState((s) => ({ ...s, connectedAt }))),
      window.api.lcu.onRanked((ranked) => setState((s) => ({ ...s, ranked }))),
      window.api.lcu.onGameSession((gameSession) => setState((s) => ({ ...s, gameSession })))
    ]

    return () => {
      cancelled = true
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [])

  return <LcuStateContext.Provider value={state}>{children}</LcuStateContext.Provider>
}

export function useLcu(): LcuState {
  return useContext(LcuStateContext)
}
