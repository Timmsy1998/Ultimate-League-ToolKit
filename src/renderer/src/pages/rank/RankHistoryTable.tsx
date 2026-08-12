import { History } from 'lucide-react'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { formatRank, formatSignedNumber, rankScore } from '@renderer/lcu/rankFormat'
import type { RankSnapshot } from '../../../../shared/rank-history-types'
import styles from './RankHistoryTable.module.css'

interface RankHistoryTableProps {
  entries: RankSnapshot[]
}

export function RankHistoryTable({ entries }: RankHistoryTableProps): React.JSX.Element {
  if (entries.length === 0) {
    return <EmptyState icon={History} title="No history yet" description="Changes to your rank will show up here." />
  }

  const rows = entries
    .map((entry, index) => {
      const previous = entries[index - 1]
      const delta = previous ? rankScore(entry) - rankScore(previous) : 0
      return { entry, delta }
    })
    .reverse()

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Rank</th>
            <th>LP</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ entry, delta }) => (
            <tr key={entry.timestamp}>
              <td>
                {new Date(entry.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td className={styles.rankCell}>{formatRank(entry)}</td>
              <td>{entry.leaguePoints} LP</td>
              <td className={delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : undefined}>
                {delta === 0 ? '—' : formatSignedNumber(delta)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
