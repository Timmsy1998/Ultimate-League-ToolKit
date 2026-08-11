import { Activity, History, PlugZap, User } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { StatusPill, type Status } from '@renderer/components/StatusPill/StatusPill'
import { useLcu } from '@renderer/lcu/LcuContext'
import { PHASE_LABELS } from '@renderer/lcu/phaseLabels'
import styles from './Page.module.css'
import dashboardStyles from './Dashboard.module.css'

const STATUS_PILL: Record<string, { status: Status; label: string }> = {
  offline: { status: 'offline', label: 'Client not detected' },
  connecting: { status: 'connecting', label: 'Connecting…' },
  online: { status: 'online', label: 'Connected' }
}

export function Dashboard(): React.JSX.Element {
  const { status, summoner, phase, activity } = useLcu()
  const pill = STATUS_PILL[status]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Overview of your League Client connection and activity.</p>
        </div>
        <StatusPill status={pill.status}>{pill.label}</StatusPill>
      </div>

      <div className={styles.grid}>
        <Card icon={PlugZap} title="League Client">
          {status === 'online' ? (
            <EmptyState icon={PlugZap} title="Connected to League Client" />
          ) : status === 'connecting' ? (
            <EmptyState icon={PlugZap} title="Connecting…" description="Found the client, finishing setup." />
          ) : (
            <EmptyState
              icon={PlugZap}
              title="Waiting for the client"
              description="Open the League Client and this will connect automatically."
            />
          )}
        </Card>

        <Card icon={User} title="Summoner">
          {summoner ? (
            <div className={dashboardStyles.summoner}>
              <p className={dashboardStyles.summonerName}>{summoner.displayName}</p>
              <p className={dashboardStyles.summonerLevel}>Level {summoner.summonerLevel}</p>
            </div>
          ) : (
            <EmptyState icon={User} title="No active session" />
          )}
        </Card>

        <Card icon={Activity} title="Session status">
          {status === 'online' ? (
            <EmptyState icon={Activity} title={PHASE_LABELS[phase] ?? phase} />
          ) : (
            <EmptyState icon={Activity} title="Nothing to show yet" />
          )}
        </Card>

        <Card icon={History} title="Recent activity">
          {activity.length > 0 ? (
            <ul className={dashboardStyles.activityList}>
              {activity.map((entry) => (
                <li key={entry.id} className={dashboardStyles.activityItem}>
                  <span className={dashboardStyles.activityMessage}>{entry.message}</span>
                  <span className={dashboardStyles.activityTime}>
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={History} title="No recent activity" />
          )}
        </Card>
      </div>
    </div>
  )
}
