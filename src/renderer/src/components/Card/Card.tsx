import type { LucideIcon } from 'lucide-react'
import styles from './Card.module.css'

interface CardProps {
  icon: LucideIcon
  title: string
  tag?: string
  children?: React.ReactNode
}

export function Card({ icon: Icon, title, tag, children }: CardProps): React.JSX.Element {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <span className={styles.iconWrap}>
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h3 className={styles.title}>{title}</h3>
        {tag ? <span className={styles.tag}>{tag}</span> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
