import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { formatElapsed } from '@renderer/lcu/formatElapsed'
import { useLcu } from '@renderer/lcu/LcuContext'
import { PHASE_LABELS } from '@renderer/lcu/phaseLabels'
import toolStyles from '../Tools.module.css'

export function SessionOverviewCard(): React.JSX.Element {
  const { status, summoner, phase, activity, connectedAt } = useLcu()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!connectedAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [connectedAt])

  if (status !== 'online' || !connectedAt) {
    return (
      <Card icon={Clock} title="Session overview">
        <EmptyState icon={Clock} title="Not connected" description="Open the League Client to start a session." />
      </Card>
    )
  }

  return (
    <Card icon={Clock} title="Session overview">
      <div className={toolStyles.statGrid}>
        <div className={toolStyles.statItem}>
          <span className={toolStyles.statLabel}>Summoner</span>
          <span className={toolStyles.statValue}>{summoner ? summoner.displayName : '—'}</span>
        </div>
        <div className={toolStyles.statItem}>
          <span className={toolStyles.statLabel}>Level</span>
          <span className={toolStyles.statValue}>{summoner ? summoner.summonerLevel : '—'}</span>
        </div>
        <div className={toolStyles.statItem}>
          <span className={toolStyles.statLabel}>Status</span>
          <span className={toolStyles.statValue}>{PHASE_LABELS[phase] ?? phase}</span>
        </div>
        <div className={toolStyles.statItem}>
          <span className={toolStyles.statLabel}>Connected for</span>
          <span className={toolStyles.statValue}>{formatElapsed(now - connectedAt)}</span>
        </div>
        <div className={toolStyles.statItem}>
          <span className={toolStyles.statLabel}>Events this session</span>
          <span className={toolStyles.statValue}>{activity.length}</span>
        </div>
      </div>
    </Card>
  )
}
