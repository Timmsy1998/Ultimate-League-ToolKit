import { BellOff, History } from 'lucide-react'
import { useLcu } from '@renderer/lcu/LcuContext'
import styles from './Page.module.css'
import notificationStyles from './Notifications.module.css'

export function Notifications(): React.JSX.Element {
  const { activity } = useLcu()

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Notifications</h1>
          <p className={styles.pageSubtitle}>
            Client and queue activity — ready checks also show up as a desktop notification.
          </p>
        </div>
      </div>

      {activity.length > 0 ? (
        <ul className={notificationStyles.list}>
          {activity.map((entry) => (
            <li key={entry.id} className={notificationStyles.item}>
              <span className={notificationStyles.itemIcon}>
                <History size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className={notificationStyles.itemMessage}>{entry.message}</span>
              <span className={notificationStyles.itemTime}>
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={notificationStyles.emptyWrap}>
          <BellOff size={28} strokeWidth={1.5} aria-hidden="true" />
          <p className={notificationStyles.title}>No notifications yet</p>
          <p className={notificationStyles.description}>
            This is where things like queue pop, ready-check, and client status alerts will appear.
          </p>
        </div>
      )}
    </div>
  )
}
