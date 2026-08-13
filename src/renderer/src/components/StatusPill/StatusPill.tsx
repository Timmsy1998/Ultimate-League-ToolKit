import styles from './StatusPill.module.css'

export type Status = 'online' | 'connecting' | 'offline' | 'warn'

interface StatusPillProps {
  status: Status
  children: React.ReactNode
}

const STATUS_CLASS: Record<Status, string> = {
  online: styles.online,
  connecting: styles.connecting,
  offline: styles.offline,
  warn: styles.warn
}

export function StatusPill({ status, children }: StatusPillProps): React.JSX.Element {
  return (
    <span className={`${styles.pill} ${STATUS_CLASS[status]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  )
}
