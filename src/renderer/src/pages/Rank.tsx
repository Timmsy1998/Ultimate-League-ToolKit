import { useEffect, useState } from 'react'
import { LineChart, Trophy } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { useLcu } from '@renderer/lcu/LcuContext'
import { LpChart } from './rank/LpChart'
import { RankHistoryTable } from './rank/RankHistoryTable'
import { RankSummary } from './rank/RankSummary'
import { EMPTY_RANK_HISTORY, type RankHistory, type RankedQueueId } from '../../../shared/rank-history-types'
import styles from './Page.module.css'
import rankStyles from './Rank.module.css'

const QUEUE_TABS: { id: RankedQueueId; label: string }[] = [
  { id: 'soloDuo', label: 'Solo/Duo' },
  { id: 'flex', label: 'Flex' }
]

export function Rank(): React.JSX.Element {
  const { status, ranked } = useLcu()
  const [history, setHistory] = useState<RankHistory>(EMPTY_RANK_HISTORY)
  const [selectedQueue, setSelectedQueue] = useState<RankedQueueId>('soloDuo')

  useEffect(() => {
    if (status !== 'online') return
    let cancelled = false

    window.api.rankHistory.get().then((next) => {
      if (!cancelled) setHistory(next)
    })

    return () => {
      cancelled = true
    }
    // Re-fetch whenever a fresh rank push arrives — a new snapshot may have
    // just been recorded on the main-process side.
  }, [status, ranked])

  const entries = history[selectedQueue]
  const currentEntry = selectedQueue === 'soloDuo' ? (ranked?.soloDuo ?? null) : (ranked?.flex ?? null)

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Rank</h1>
          <p className={styles.pageSubtitle}>Track your LP over time, one match at a time.</p>
        </div>
        <div className={rankStyles.queueTabs} role="tablist" aria-label="Queue">
          {QUEUE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selectedQueue === tab.id}
              className={
                selectedQueue === tab.id ? `${rankStyles.queueTab} ${rankStyles.queueTabActive}` : rankStyles.queueTab
              }
              onClick={() => setSelectedQueue(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {status !== 'online' ? (
        <EmptyState icon={Trophy} title="Not connected" description="Open the League Client to see your rank." />
      ) : (
        <div className={rankStyles.layout}>
          <RankSummary entry={currentEntry} history={entries} />

          <Card icon={LineChart} title="LP over time">
            <LpChart entries={entries} />
          </Card>

          <Card icon={Trophy} title="History" tag={entries.length > 0 ? String(entries.length) : undefined}>
            <RankHistoryTable entries={entries} />
          </Card>
        </div>
      )}
    </div>
  )
}
