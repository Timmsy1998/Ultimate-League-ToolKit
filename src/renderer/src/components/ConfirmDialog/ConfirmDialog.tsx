import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.footer}>
          <button type="button" className={styles.closeButton} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? `${styles.confirmButton} ${styles.danger}` : styles.confirmButton}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
