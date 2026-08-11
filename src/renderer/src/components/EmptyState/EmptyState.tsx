import type { LucideIcon } from 'lucide-react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps): React.JSX.Element {
  return (
    <div className={styles.emptyState}>
      <Icon size={22} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  )
}
