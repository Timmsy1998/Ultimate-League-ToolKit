import { BellOff } from 'lucide-react'
import styles from './Page.module.css'
import notificationStyles from './Notifications.module.css'

export function Notifications(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Notifications</h1>
          <p className={styles.pageSubtitle}>
            Client and queue alerts will show up here once notifications are wired up.
          </p>
        </div>
      </div>

      <div className={notificationStyles.emptyWrap}>
        <BellOff size={28} strokeWidth={1.5} aria-hidden="true" />
        <p className={notificationStyles.title}>No notifications yet</p>
        <p className={notificationStyles.description}>
          This is where things like queue pop, ready-check, and client status alerts will appear.
        </p>
      </div>
    </div>
  )
}
