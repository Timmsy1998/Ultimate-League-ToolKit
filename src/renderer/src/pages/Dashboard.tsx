import { Activity, History, PlugZap, User } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { StatusPill } from '@renderer/components/StatusPill/StatusPill'
import styles from './Page.module.css'

export function Dashboard(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Overview of your League Client connection and activity.</p>
        </div>
        <StatusPill status="offline">Client not detected</StatusPill>
      </div>

      <div className={styles.grid}>
        <Card icon={PlugZap} title="League Client">
          <EmptyState
            icon={PlugZap}
            title="Waiting for the client"
            description="Open the League Client and this will connect automatically."
          />
        </Card>

        <Card icon={User} title="Summoner">
          <EmptyState icon={User} title="No active session" />
        </Card>

        <Card icon={Activity} title="Session status">
          <EmptyState icon={Activity} title="Nothing to show yet" />
        </Card>

        <Card icon={History} title="Recent activity">
          <EmptyState icon={History} title="No recent activity" />
        </Card>
      </div>
    </div>
  )
}
