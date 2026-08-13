import { useEffect, useState } from 'react'

export function useAppVersion(): string {
  const [version, setVersion] = useState('')

  useEffect(() => {
    let cancelled = false
    window.api.app.getVersion().then((v) => {
      if (!cancelled) setVersion(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return version
}
