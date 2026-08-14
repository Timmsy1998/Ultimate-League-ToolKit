import { useEffect, useRef, useState } from 'react'
import type { ChampionSummary, PerkCatalog, RunePageDetail } from '../../../../shared/lcu-types'
import type { RuneBook, RuneBookPage } from '../../../../shared/rune-book-types'
import { classifySelectedPerkIds } from './classifySelection'
import styles from './ImportDialog.module.css'

interface PullFromClientDialogProps {
  catalog: PerkCatalog
  champion: ChampionSummary | null
  onClose: () => void
  onPulled: (book: RuneBook) => void
}

type DialogState = 'loading' | 'choose' | 'pulling' | 'success' | 'empty' | 'error'

export function PullFromClientDialog({
  catalog,
  champion,
  onClose,
  onPulled
}: PullFromClientDialogProps): React.JSX.Element {
  const [state, setState] = useState<DialogState>('loading')
  const [pages, setPages] = useState<RunePageDetail[]>([])
  const [pulledName, setPulledName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const hasStartedLoad = useRef(false)

  useEffect(() => {
    // Same StrictMode double-invoke guard as ImportDialog — this also
    // reaches the LCU, and listing pages is safe to call twice but there's
    // no reason to.
    if (hasStartedLoad.current) return
    hasStartedLoad.current = true
    setState('loading')
    window.api.lcu
      .getRunePageDetails()
      .then((result) => {
        setPages(result)
        setState(result.length > 0 ? 'choose' : 'empty')
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load rune pages.')
        setState('error')
      })
  }, [])

  async function pull(page: RunePageDetail): Promise<void> {
    setState('pulling')
    const selection = classifySelectedPerkIds(catalog, page.primaryStyleId, page.subStyleId, page.selectedPerkIds)
    if (!selection) {
      setErrorMessage(`"${page.name}" uses a rune tree layout ULTK couldn't match — try rebuilding it by hand.`)
      setState('error')
      return
    }

    const now = Date.now()
    const newPage: RuneBookPage = {
      id: crypto.randomUUID(),
      name: page.name,
      championId: champion?.id ?? null,
      championName: champion?.name ?? null,
      primaryStyleId: page.primaryStyleId,
      subStyleId: page.subStyleId,
      selection,
      createdAt: now,
      updatedAt: now
    }

    try {
      const book = await window.api.runeBook.savePage(newPage)
      setPulledName(page.name)
      onPulled(book)
      setState('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save the pulled page.')
      setState('error')
    }
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        {state === 'loading' ? (
          <>
            <div className={styles.titleRow}>
              <span className={styles.spinner} aria-hidden="true" />
              <h3 className={styles.title}>Reading client rune pages…</h3>
            </div>
            <p className={styles.message}>Talking to the League Client.</p>
          </>
        ) : state === 'choose' ? (
          <>
            <h3 className={styles.title}>Pull a page from the client</h3>
            <p className={styles.message}>
              {champion ? `Saved under ${champion.name}.` : 'Pick a client page to copy into your rune book.'}
            </p>
            <ul className={styles.pageList}>
              {pages.map((page) => (
                <li key={page.id}>
                  <button type="button" className={styles.pageButton} onClick={() => void pull(page)}>
                    {page.name}
                    {page.current ? ' (current)' : ''}
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
        ) : state === 'pulling' ? (
          <>
            <div className={styles.titleRow}>
              <span className={styles.spinner} aria-hidden="true" />
              <h3 className={styles.title}>Saving to your rune book…</h3>
            </div>
          </>
        ) : state === 'success' ? (
          <>
            <h3 className={styles.title}>Pulled</h3>
            <p className={styles.message}>"{pulledName}" is now saved in your rune book.</p>
            <div className={styles.footer}>
              <button type="button" className={styles.closeButton} onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : state === 'empty' ? (
          <>
            <h3 className={styles.title}>No rune pages found</h3>
            <p className={styles.message}>Build a page in the League Client's own rune editor first, then try again.</p>
            <div className={styles.footer}>
              <button type="button" className={styles.closeButton} onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className={styles.title}>Couldn't pull that page</h3>
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
