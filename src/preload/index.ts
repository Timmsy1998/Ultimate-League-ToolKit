import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Nothing app-specific is exposed yet — this is UI scaffolding only. Future
// LCU-facing calls will be added here as explicit, typed, validated
// channels rather than a generic passthrough.
const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error contextIsolation is always on; this branch only runs
  // if that invariant is ever broken, and TS shouldn't assume window.api.
  window.electron = electronAPI
  // @ts-expect-error see above
  window.api = api
}
