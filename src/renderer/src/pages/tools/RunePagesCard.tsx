import { useState } from 'react'
import { BookOpen, RefreshCw } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { useLcu } from '@renderer/lcu/LcuContext'
import type { RunePageSummary } from '../../../../shared/lcu-types'
import toolStyles from '../Tools.module.css'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

export function RunePagesCard(): React.JSX.Element {
  const { status } = useLcu()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [pages, setPages] = useState<RunePageSummary[]>([])

  async function loadPages(): Promise<void> {
    setLoadState('loading')
    try {
      const result = await window.api.lcu.getRunePages()
      setPages(result)
      setLoadState('loaded')
    } catch {
      setLoadState('error')
    }
  }

  return (
    <Card icon={BookOpen} title="Rune pages">
      {status !== 'online' ? (
        <EmptyState icon={BookOpen} title="Not connected" description="Open the League Client to view rune pages." />
      ) : loadState === 'idle' ? (
        <div className={toolStyles.actionWrap}>
          <p className={toolStyles.description}>View your saved rune pages.</p>
          <button type="button" className={toolStyles.actionButton} onClick={() => void loadPages()}>
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
            Load rune pages
          </button>
        </div>
      ) : loadState === 'loading' ? (
        <EmptyState icon={RefreshCw} title="Loading…" />
      ) : loadState === 'error' ? (
        <EmptyState icon={BookOpen} title="Couldn't load rune pages" description="Try again in a moment." />
      ) : pages.length === 0 ? (
        <EmptyState icon={BookOpen} title="No rune pages yet" />
      ) : (
        <ul className={toolStyles.pageList}>
          {pages.map((page) => (
            <li key={page.id} className={toolStyles.pageItem}>
              <div className={toolStyles.pageNameRow}>
                <span className={toolStyles.pageName}>{page.name}</span>
                {page.current ? <span className={toolStyles.pageBadge}>Active</span> : null}
              </div>
              <span className={toolStyles.pageStyles}>
                {page.primaryStyleName} · {page.subStyleName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
