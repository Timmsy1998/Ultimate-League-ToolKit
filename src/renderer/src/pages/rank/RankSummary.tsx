import { Trophy } from 'lucide-react'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { formatRank, rankScore, tierColor } from '@renderer/lcu/rankFormat'
import type { RankedEntry } from '../../../../shared/lcu-types'
import type { RankSnapshot } from '../../../../shared/rank-history-types'
import styles from './RankSummary.module.css'

interface RankSummaryProps {
  entry: RankedEntry | null
  history: RankSnapshot[]
}

export function RankSummary({ entry, history }: RankSummaryProps): React.JSX.Element {
  if (!entry) {
    return <EmptyState icon={Trophy} title="Loading rank…" />
  }

  const color = entry.tier ? tierColor(entry.tier) : undefined
  const totalGames = entry.wins + entry.losses
  const winRate = totalGames > 0 ? Math.round((entry.wins / totalGames) * 100) : null

  const peak = history.reduce<RankSnapshot | null>((best, snapshot) => {
    if (!best || rankScore(snapshot) > rankScore(best)) return snapshot
    return best
  }, null)
  const currentScore = rankScore(entry)
  const peakEntry = peak && rankScore(peak) > currentScore ? peak : null

  return (
    <div
      className={styles.summary}
      style={color ? ({ '--tier-color': color } as React.CSSProperties) : undefined}
    >
      <div className={styles.badge}>
        <span className={styles.tier}>{formatRank(entry)}</span>
        {entry.tier ? <span className={styles.lp}>{entry.leaguePoints} LP</span> : null}
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Record</span>
          <span className={styles.statValue}>
            {entry.wins}W {entry.losses}L
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Win rate</span>
          <span className={styles.statValue}>{winRate !== null ? `${winRate}%` : '—'}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Peak this history</span>
          <span className={styles.statValue}>{peakEntry ? formatRank(peakEntry) : formatRank(entry)}</span>
        </div>
        {entry.isProvisional ? (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Status</span>
            <span className={styles.statValue}>Provisional</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
