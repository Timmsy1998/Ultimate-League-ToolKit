import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ActivityEntry, GameflowPhase, LcuSnapshot, RunePageSummary, MatchSummary, SummonerInfo } from '../shared/lcu-types'
import type { Settings } from '../shared/settings-types'

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
  getRunePages: (): Promise<RunePageSummary[]> => ipcRenderer.invoke('lcu:get-rune-pages')
  getMatchHistory: (): Promise<MatchSummary[]> => ipcRenderer.invoke('lcu:get-match-history')
}

const settings = {
  get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  set: (partial: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:set', partial)
}

const theme = {
  // Fire-and-forget: lets main keep the native titlebar overlay in sync
  // with the resolved (post-'system') theme. No response expected.
  reportEffective: (value: 'dark' | 'light'): void => {
    ipcRenderer.send('theme:effective-changed', value)
  }
}

const api = { lcu, settings, theme }

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
