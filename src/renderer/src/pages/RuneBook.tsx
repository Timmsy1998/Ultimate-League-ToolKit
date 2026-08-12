import { useEffect, useMemo, useState } from 'react'
import { NotebookPen, RefreshCw } from 'lucide-react'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { useLcu } from '@renderer/lcu/LcuContext'
import type { ChampionSummary, PerkCatalog } from '../../../shared/lcu-types'
import type { RuneBook as RuneBookData, RuneBookPage } from '../../../shared/rune-book-types'
import { AssetIcon } from '@renderer/components/AssetIcon/AssetIcon'
import { ChampionPicker } from './rune-book/ChampionPicker'
import { ImportDialog } from './rune-book/ImportDialog'
import { PageList } from './rune-book/PageList'
import { RuneEditor } from './rune-book/RuneEditor'
import pageStyles from './Page.module.css'
import styles from './RuneBook.module.css'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

export function RuneBook(): React.JSX.Element {
  const { status } = useLcu()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [champions, setChampions] = useState<ChampionSummary[]>([])
  const [catalog, setCatalog] = useState<PerkCatalog | null>(null)
  const [book, setBook] = useState<RuneBookData>({ pages: [] })
  const [selectedChampionId, setSelectedChampionId] = useState<number | null>(null)
  const [editorTarget, setEditorTarget] = useState<'new' | RuneBookPage | null>(null)
  const [importTarget, setImportTarget] = useState<RuneBookPage | null>(null)

  useEffect(() => {
    if (status !== 'online') {
      setLoadState('idle')
      return
    }

    let cancelled = false
    setLoadState('loading')

    Promise.all([window.api.lcu.getChampions(), window.api.lcu.getPerkCatalog(), window.api.runeBook.get()])
      .then(([champs, perkCatalog, runeBook]) => {
        if (cancelled) return
        setChampions(champs)
        setCatalog(perkCatalog)
        setBook(runeBook)
        setSelectedChampionId((prev) => prev ?? champs[0]?.id ?? null)
        setLoadState('loaded')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [status])

  const selectedChampion = useMemo(
    () => champions.find((c) => c.id === selectedChampionId) ?? null,
    [champions, selectedChampionId]
  )

  const pagesForChampion = useMemo(
    () => book.pages.filter((p) => p.championId === selectedChampionId),
    [book, selectedChampionId]
  )

  const pageCountByChampion = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of book.pages) {
      if (p.championId === null) continue
      map.set(p.championId, (map.get(p.championId) ?? 0) + 1)
    }
    return map
  }, [book])

  const styleNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const style of catalog?.styles ?? []) map.set(style.id, style.name)
    return map
  }, [catalog])

  function handleSelectChampion(champion: ChampionSummary): void {
    setSelectedChampionId(champion.id)
    setEditorTarget(null)
  }

  function handleSavePage(page: RuneBookPage): void {
    void window.api.runeBook.savePage(page).then((updated) => {
      setBook(updated)
      setEditorTarget(null)
    })
  }

  function handleDuplicate(page: RuneBookPage): void {
    const now = Date.now()
    const clone: RuneBookPage = { ...page, id: crypto.randomUUID(), name: `${page.name} copy`, createdAt: now, updatedAt: now }
    void window.api.runeBook.savePage(clone).then(setBook)
  }

  function handleDelete(page: RuneBookPage): void {
    if (!window.confirm(`Delete "${page.name}" from your rune book? This can't be undone.`)) return
    void window.api.runeBook.deletePage(page.id).then(setBook)
  }

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1 className={pageStyles.pageTitle}>Rune book</h1>
          <p className={pageStyles.pageSubtitle}>
            Build rune pages per champion and import them straight into the League Client.
          </p>
        </div>
      </div>

      {status !== 'online' ? (
        <EmptyState icon={NotebookPen} title="Not connected" description="Open the League Client to build rune pages." />
      ) : loadState === 'loading' || loadState === 'idle' ? (
        <EmptyState icon={RefreshCw} title="Loading champions and rune data…" />
      ) : loadState === 'error' ? (
        <EmptyState icon={NotebookPen} title="Couldn't load rune data" description="Try again in a moment." />
      ) : !catalog ? null : (
        <div className={styles.layout}>
          <div className={styles.sidebar}>
            <ChampionPicker
              champions={champions}
              selectedId={selectedChampionId}
              pageCountByChampion={pageCountByChampion}
              onSelect={handleSelectChampion}
            />
          </div>

          <div className={styles.content}>
            {selectedChampion ? (
              <div className={styles.contentHeader} key={selectedChampion.id}>
                <AssetIcon
                  path={selectedChampion.squarePortraitPath}
                  label={selectedChampion.name}
                  size={40}
                  round
                />
                <h2 className={styles.championName}>{selectedChampion.name}</h2>
              </div>
            ) : null}

            {editorTarget ? (
              <RuneEditor
                catalog={catalog}
                champion={selectedChampion}
                initialPage={editorTarget === 'new' ? null : editorTarget}
                onSave={handleSavePage}
                onCancel={() => setEditorTarget(null)}
              />
            ) : (
              <PageList
                title="Saved pages"
                pages={pagesForChampion}
                styleNameById={styleNameById}
                onNew={() => setEditorTarget('new')}
                onEdit={(page) => setEditorTarget(page)}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onImport={(page) => setImportTarget(page)}
              />
            )}
          </div>
        </div>
      )}

      {importTarget ? <ImportDialog page={importTarget} onClose={() => setImportTarget(null)} /> : null}
    </div>
  )
}
