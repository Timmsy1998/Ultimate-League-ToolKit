import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BellRing,
  Flag,
  History,
  type LucideIcon,
  NotebookPen,
  PlugZap,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wrench
} from 'lucide-react'
import { AssetIcon } from '@renderer/components/AssetIcon/AssetIcon'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { Card } from '@renderer/components/Card/Card'
import { StatusPill, type Status } from '@renderer/components/StatusPill/StatusPill'
import { formatElapsed } from '@renderer/lcu/formatElapsed'
import { useLcu } from '@renderer/lcu/LcuContext'
import { PHASE_LABELS } from '@renderer/lcu/phaseLabels'
import { formatRank, tierColor } from '@renderer/lcu/rankFormat'
import { useNavigation } from '@renderer/navigation/NavigationContext'
import type { PageId } from '@renderer/components/Sidebar/Sidebar'
import { useAppVersion } from '@renderer/updater/useAppVersion'
import { useUpdater } from '@renderer/updater/UpdaterContext'
import type { RankedEntry } from '../../../shared/lcu-types'
import styles from './Page.module.css'
import dashboardStyles from './Dashboard.module.css'

const STATUS_PILL: Record<string, { status: Status; label: string }> = {
  offline: { status: 'offline', label: 'Client not detected' },
  connecting: { status: 'connecting', label: 'Connecting…' },
  online: { status: 'online', label: 'Connected' }
}

const QUICK_ACTIONS: { id: PageId; icon: LucideIcon; title: string; description: string }[] = [
  { id: 'rank', icon: Trophy, title: 'Rank', description: 'LP history & full stats' },
  { id: 'rune-book', icon: NotebookPen, title: 'Rune book', description: 'Build and import rune pages' },
  { id: 'tools', icon: Wrench, title: 'Tools', description: 'Match history, session stats & more' },
  { id: 'notifications', icon: BellRing, title: 'Notifications', description: 'Ready checks & queue activity' },
  { id: 'settings', icon: SettingsIcon, title: 'Settings', description: 'Theme, startup & notifications' }
]

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still up?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function activityIcon(message: string): LucideIcon {
  const m = message.toLowerCase()
  if (m.includes('champion select')) return Swords
  if (m.includes('ready check')) return BellRing
  if (m.includes('searching')) return Search
  if (m.includes('lobby')) return Users
  if (m.includes('game started')) return Activity
  if (m.includes('game ended')) return Flag
  if (m.includes('connected')) return PlugZap
  return History
}

function updateHint(status: ReturnType<typeof useUpdater>['state']['status']): string {
  if (status === 'downloaded') return 'Update ready to install'
  if (status === 'available' || status === 'downloading') return 'Update downloading…'
  if (status === 'error') return 'Update check failed'
  return "You're up to date"
}

function RankTile({ label, entry }: { label: string; entry: RankedEntry | null }): React.JSX.Element {
  const color = entry?.tier ? tierColor(entry.tier) : undefined
  return (
    <div
      className={dashboardStyles.rankTile}
      style={color ? ({ '--tier-color': color } as React.CSSProperties) : undefined}
    >
      <span className={dashboardStyles.rankQueue}>{label}</span>
      <span className={dashboardStyles.rankTier}>{formatRank(entry)}</span>
      {entry?.tier ? (
        <span className={dashboardStyles.rankMeta}>
          {entry.leaguePoints} LP · {entry.wins}W {entry.losses}L
          {entry.isProvisional ? ' · Provisional' : ''}
        </span>
      ) : null}
    </div>
  )
}

export function Dashboard(): React.JSX.Element {
  const { status, summoner, phase, activity, connectedAt, ranked, gameSession } = useLcu()
  const navigate = useNavigation()
  const version = useAppVersion()
  const { state } = useUpdater()
  const pill = STATUS_PILL[status]
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!connectedAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [connectedAt])

  const phaseLabel = PHASE_LABELS[phase] ?? phase
  const statusLine = status === 'online' ? [gameSession?.queueName, phaseLabel].filter(Boolean).join(' · ') : 'Offline'

  const heroSubtitle = summoner
    ? `Level ${summoner.summonerLevel} · ${statusLine}`
    : status === 'connecting'
      ? 'Connecting to the League Client…'
      : "Open the League Client and we'll connect automatically."

  return (
    <div className={styles.page}>
      <section className={dashboardStyles.hero}>
        <div className={dashboardStyles.heroIdentity}>
          {summoner ? (
            <AssetIcon
              path={`/lol-game-data/assets/v1/profile-icons/${summoner.profileIconId}.jpg`}
              label={summoner.displayName}
              size={56}
              round
            />
          ) : (
            <div className={dashboardStyles.heroIconPlaceholder}>
              <PlugZap size={24} strokeWidth={1.75} aria-hidden="true" />
            </div>
          )}
          <div>
            <h1 className={dashboardStyles.heroTitle}>
              {greeting()}
              {summoner ? `, ${summoner.displayName}` : ''}
            </h1>
            <p className={dashboardStyles.heroSubtitle}>{heroSubtitle}</p>
          </div>
        </div>
        <StatusPill status={pill.status}>{pill.label}</StatusPill>
      </section>

      <div className={dashboardStyles.statStrip}>
        <div className={dashboardStyles.statTile}>
          <span className={dashboardStyles.statLabel}>Connected for</span>
          <span className={dashboardStyles.statValue}>{connectedAt ? formatElapsed(now - connectedAt) : '—'}</span>
        </div>
        <div className={dashboardStyles.statTile}>
          <span className={dashboardStyles.statLabel}>Session status</span>
          <span className={dashboardStyles.statValue}>{status === 'online' ? phaseLabel : 'Offline'}</span>
        </div>
        <div className={dashboardStyles.statTile}>
          <span className={dashboardStyles.statLabel}>Events this session</span>
          <span className={dashboardStyles.statValue}>{activity.length}</span>
        </div>
        <div className={dashboardStyles.statTile}>
          <span className={dashboardStyles.statLabel}>ULTK</span>
          <span className={dashboardStyles.statValue}>{version ? `v${version}` : '—'}</span>
          <span className={dashboardStyles.statHint}>{updateHint(state.status)}</span>
        </div>
      </div>

      <div className={dashboardStyles.mainGrid}>
        <Card icon={Sparkles} title="Quick actions">
          <div className={dashboardStyles.actionList}>
            {QUICK_ACTIONS.map(({ id, icon: Icon, title, description }) => (
              <button key={id} type="button" className={dashboardStyles.actionCard} onClick={() => navigate(id)}>
                <span className={dashboardStyles.actionIcon}>
                  <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className={dashboardStyles.actionText}>
                  <span className={dashboardStyles.actionTitle}>{title}</span>
                  <span className={dashboardStyles.actionDescription}>{description}</span>
                </span>
                <ArrowRight size={14} strokeWidth={1.75} className={dashboardStyles.actionArrow} aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>

        <Card icon={Trophy} title="Rank">
          {status !== 'online' ? (
            <EmptyState icon={Trophy} title="Not connected" description="Rank shows up once the client connects." />
          ) : !ranked ? (
            <EmptyState icon={Trophy} title="Loading rank…" />
          ) : (
            <div className={dashboardStyles.rankGrid}>
              <RankTile label="Solo/Duo" entry={ranked.soloDuo} />
              <RankTile label="Flex" entry={ranked.flex} />
            </div>
          )}
        </Card>

        <Card icon={History} title="Recent activity" tag={activity.length > 0 ? String(activity.length) : undefined}>
          {activity.length > 0 ? (
            <ul className={dashboardStyles.activityList}>
              {activity.map((entry, index) => {
                const Icon = activityIcon(entry.message)
                return (
                  <li
                    key={entry.id}
                    className={dashboardStyles.activityItem}
                    style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
                  >
                    <span className={dashboardStyles.activityIcon}>
                      <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className={dashboardStyles.activityMessage}>{entry.message}</span>
                    <span className={dashboardStyles.activityTime}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon={History}
              title="No recent activity"
              description="Client events will show up here as they happen."
            />
          )}
        </Card>
      </div>
    </div>
  )
}
