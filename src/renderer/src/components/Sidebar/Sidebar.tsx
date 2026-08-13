import { Bell, Gauge, Info, NotebookPen, Palette, PlugZap, Settings, Trophy, Wrench } from 'lucide-react'
import { useLcu } from '@renderer/lcu/LcuContext'
import type { ConnectionStatus } from '../../../../shared/lcu-types'
import styles from './Sidebar.module.css'

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  online: 'League Client: connected',
  connecting: 'League Client: connecting…',
  offline: 'League Client: not detected'
}

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  online: styles.online,
  connecting: styles.connecting,
  offline: styles.offline
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'rank', label: 'Rank', icon: Trophy },
  { id: 'rune-book', label: 'Rune book', icon: NotebookPen },
  { id: 'client-theme', label: 'Client Theme', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'about', label: 'About', icon: Info }
] as const

export type PageId = (typeof NAV_ITEMS)[number]['id']

interface SidebarProps {
  active: PageId
  onNavigate: (id: PageId) => void
}

export function Sidebar({ active, onNavigate }: SidebarProps): React.JSX.Element {
  const { status } = useLcu()

  return (
    <nav className={styles.sidebar} aria-label="Primary">
      <ul className={styles.navList}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <li key={id}>
              <button
                type="button"
                className={isActive ? `${styles.navButton} ${styles.active}` : styles.navButton}
                title={label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(id)}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className={styles.srOnly}>{label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className={styles.status}>
        <button
          type="button"
          className={`${styles.statusButton} ${STATUS_CLASS[status]}`}
          title={STATUS_LABEL[status]}
        >
          <PlugZap size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className={styles.srOnly}>{STATUS_LABEL[status]}</span>
        </button>
      </div>
    </nav>
  )
}
