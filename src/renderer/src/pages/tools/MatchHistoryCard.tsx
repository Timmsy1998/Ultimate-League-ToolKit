import { useState } from 'react'
import { LayoutList, RefreshCw } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { useLcu } from '@renderer/lcu/LcuContext'
import type { MatchSummary } from '../../../../shared/lcu-types'
import toolStyles from '../Tools.module.css'

const GAME_MODE_LABELS: Partial<Record<string, string>> = {
  CLASSIC: "Summoner's Rift",
  ARAM: 'ARAM',
  URF: 'URF',
  TUTORIAL: 'Tutorial',
  PRACTICETOOL: 'Practice Tool',
  ONEFORALL: 'One for All'
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

export function MatchHistoryCard(): React.JSX.Element {
  const { status } = useLcu()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [matches, setMatches] = useState<MatchSummary[]>([])

  async function loadMatches(): Promise<void> {
    setLoadState('loading')
    try {
      const result = await window.api.lcu.getMatchHistory()
      setMatches(result)
      setLoadState('loaded')
    } catch {
      setLoadState('error')
    }
  }

  return (
    <Card icon={LayoutList} title="Match history">
      {status !== 'online' ? (
        <EmptyState
          icon={LayoutList}
          title="Not connected"
          description="Open the League Client to browse recent games."
        />
      ) : loadState === 'idle' ? (
        <div className={toolStyles.actionWrap}>
          <p className={toolStyles.description}>Browse your recent games without leaving ULTK.</p>
          <button type="button" className={toolStyles.actionButton} onClick={() => void loadMatches()}>
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
            Load match history
          </button>
        </div>
      ) : loadState === 'loading' ? (
        <EmptyState icon={RefreshCw} title="Loading…" />
      ) : loadState === 'error' ? (
        <EmptyState icon={LayoutList} title="Couldn't load match history" description="Try again in a moment." />
      ) : matches.length === 0 ? (
        <EmptyState icon={LayoutList} title="No recent games" />
      ) : (
        <ul className={toolStyles.matchList}>
          {matches.map((match) => (
            <li key={match.gameId} className={toolStyles.matchItem}>
              <span
                className={
                  match.win === true
                    ? `${toolStyles.matchResult} ${toolStyles.matchWin}`
                    : match.win === false
                      ? `${toolStyles.matchResult} ${toolStyles.matchLoss}`
                      : toolStyles.matchResult
                }
              >
                {match.win === true ? 'Win' : match.win === false ? 'Loss' : '—'}
              </span>
              <span className={toolStyles.matchMode}>{GAME_MODE_LABELS[match.queueType] ?? match.queueType}</span>
              <span className={toolStyles.matchDuration}>{formatDuration(match.durationSeconds)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
