import { useEffect, useState } from 'react'

// Module-level so the cache survives remounts (e.g. scrolling a champion
// list in and out of view, or navigating away and back) for the lifetime
// of the renderer — icons are already cached again on the main-process
// side, this just skips the repeat IPC round-trip.
const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

export function useLcuAsset(path: string | null): string | null {
  const [dataUri, setDataUri] = useState<string | null>(path ? (cache.get(path) ?? null) : null)

  useEffect(() => {
    if (!path) {
      setDataUri(null)
      return
    }

    const cached = cache.get(path)
    if (cached) {
      setDataUri(cached)
      return
    }

    let cancelled = false
    const pending = inflight.get(path) ?? window.api.lcu.getAsset(path)
    inflight.set(path, pending)

    pending
      .then((uri) => {
        cache.set(path, uri)
        if (!cancelled) setDataUri(uri)
      })
      .catch(() => {
        if (!cancelled) setDataUri(null)
      })
      .finally(() => {
        inflight.delete(path)
      })

    return () => {
      cancelled = true
    }
  }, [path])

  return dataUri
}
