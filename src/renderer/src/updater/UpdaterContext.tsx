import { createContext, useContext, useEffect, useState } from 'react'
import type { UpdaterState } from '../../../shared/updater-types'

interface UpdaterContextValue {
  state: UpdaterState
  check: () => void
  install: () => void
}

const INITIAL_STATE: UpdaterState = { status: 'idle' }

const UpdaterStateContext = createContext<UpdaterContextValue>({
  state: INITIAL_STATE,
  check: () => {},
  install: () => {}
})

export function UpdaterProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<UpdaterState>(INITIAL_STATE)

  useEffect(() => {
    let cancelled = false

    window.api.updater.getState().then((initial) => {
      if (!cancelled) setState(initial)
    })

    const unsubscribe = window.api.updater.onState((next) => setState(next))

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  function check(): void {
    void window.api.updater.check()
  }

  function install(): void {
    window.api.updater.install()
  }

  return <UpdaterStateContext.Provider value={{ state, check, install }}>{children}</UpdaterStateContext.Provider>
}

export function useUpdater(): UpdaterContextValue {
  return useContext(UpdaterStateContext)
}
