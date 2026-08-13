import { AlertTriangle, DownloadCloud, Loader2, RefreshCw } from 'lucide-react'
import { useUpdater } from '@renderer/updater/UpdaterContext'
import styles from './UpdateBanner.module.css'

// Silent for the states nobody needs to act on ('idle', 'checking',
// 'not-available') — a background update check shouldn't announce itself.
export function UpdateBanner(): React.JSX.Element | null {
  const { state, install } = useUpdater()

  if (state.status === 'available') {
    return (
      <div className={styles.banner}>
        <span className={styles.icon}>
          <DownloadCloud size={15} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className={styles.message}>Update {state.version} found — downloading in the background.</p>
      </div>
    )
  }

  if (state.status === 'downloading') {
    return (
      <div className={styles.banner}>
        <span className={styles.icon}>
          <Loader2 size={15} strokeWidth={1.75} className={styles.spin} aria-hidden="true" />
        </span>
        <p className={styles.message}>Downloading update — {state.percent}%</p>
      </div>
    )
  }

  if (state.status === 'downloaded') {
    return (
      <div className={styles.banner}>
        <span className={styles.icon}>
          <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className={styles.message}>Update {state.version} is ready to install.</p>
        <button type="button" className={styles.action} onClick={install}>
          Restart & update
        </button>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className={styles.banner}>
        <span className={`${styles.icon} ${styles.iconError}`}>
          <AlertTriangle size={15} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className={styles.message}>Update check failed — {state.message}</p>
      </div>
    )
  }

  return null
}
