import { useEffect, useState } from 'react'
import type { EditableRunePage } from '../../../../shared/lcu-types'
import type { RuneBookPage } from '../../../../shared/rune-book-types'
import styles from './ImportDialog.module.css'

interface ImportDialogProps {
  page: RuneBookPage
  onClose: () => void
}

type DialogState = 'importing' | 'success' | 'choose-overwrite' | 'error'

function buildSelectedPerkIds(page: RuneBookPage): number[] {
  const { selection } = page
  return [
    selection.keystoneId,
    ...selection.primaryPerkIds,
    ...selection.subPerkIds,
    ...selection.statShardIds
  ]
}

export function ImportDialog({ page, onClose }: ImportDialogProps): React.JSX.Element {
  const [state, setState] = useState<DialogState>('importing')
  const [editablePages, setEditablePages] = useState<EditableRunePage[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  async function attemptImport(overwritePageId?: number): Promise<void> {
    setState('importing')
    try {
      const result = await window.api.lcu.importRunePage({
        name: page.name,
        championId: page.championId,
        primaryStyleId: page.primaryStyleId,
        subStyleId: page.subStyleId,
        selectedPerkIds: buildSelectedPerkIds(page),
        overwritePageId
      })

      if (result.ok) {
        setState('success')
        return
      }

      if (result.editablePages && result.editablePages.length > 0) {
        setEditablePages(result.editablePages)
        setErrorMessage(result.error ?? '')
        setState('choose-overwrite')
      } else {
        setErrorMessage(result.error ?? 'Import failed.')
        setState('error')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Import failed.')
      setState('error')
    }
  }

  useEffect(() => {
    void attemptImport()
    // Only run once, on mount — retries go through attemptImport directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        {state === 'importing' ? (
          <>
            <div className={styles.titleRow}>
              <span className={styles.spinner} aria-hidden="true" />
              <h3 className={styles.title}>Importing "{page.name}"…</h3>
            </div>
            <p className={styles.message}>Talking to the League Client.</p>
          </>
        ) : state === 'success' ? (
          <>
            <h3 className={styles.title}>Imported</h3>
            <p className={styles.message}>"{page.name}" is now a page in your League Client.</p>
            <div className={styles.footer}>
              <button type="button" className={styles.closeButton} onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : state === 'choose-overwrite' ? (
          <>
            <h3 className={styles.title}>No free page slots</h3>
            <p className={styles.message}>Pick one of your existing client pages to overwrite with "{page.name}".</p>
            <ul className={styles.pageList}>
              {editablePages.map((editable) => (
                <li key={editable.id}>
                  <button type="button" className={styles.pageButton} onClick={() => void attemptImport(editable.id)}>
                    {editable.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.footer}>
              <button type="button" className={styles.closeButton} onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className={styles.title}>Import failed</h3>
            <p className={styles.errorMessage}>{errorMessage}</p>
            <div className={styles.footer}>
              <button type="button" className={styles.closeButton} onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
