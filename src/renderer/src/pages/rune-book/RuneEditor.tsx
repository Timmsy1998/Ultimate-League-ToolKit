import { useMemo, useState } from 'react'
import { AssetIcon } from '@renderer/components/AssetIcon/AssetIcon'
import type { ChampionSummary, PerkCatalog, RuneStyle } from '../../../../shared/lcu-types'
import type { RuneBookPage } from '../../../../shared/rune-book-types'
import styles from './RuneEditor.module.css'

interface RuneEditorProps {
  catalog: PerkCatalog
  champion: ChampionSummary | null
  initialPage: RuneBookPage | null
  onSave: (page: RuneBookPage) => void
  onCancel: () => void
}

function perkName(catalog: PerkCatalog, id: number | null): string {
  if (id === null) return ''
  return catalog.perks[id]?.name ?? `Perk ${id}`
}

function perkIconPath(catalog: PerkCatalog, id: number | null): string {
  if (id === null) return ''
  return catalog.perks[id]?.iconPath ?? ''
}

export function RuneEditor({ catalog, champion, initialPage, onSave, onCancel }: RuneEditorProps): React.JSX.Element {
  const initial = initialPage?.selection ?? null

  const [name, setName] = useState(initialPage?.name ?? (champion ? `${champion.name} build` : 'New page'))
  const [primaryStyleId, setPrimaryStyleId] = useState<number | null>(initialPage?.primaryStyleId ?? null)
  const [keystoneId, setKeystoneId] = useState<number | null>(initial?.keystoneId ?? null)
  const [primaryPerkIds, setPrimaryPerkIds] = useState<(number | null)[]>(initial?.primaryPerkIds ?? [null, null, null])
  const [subStyleId, setSubStyleId] = useState<number | null>(initialPage?.subStyleId ?? null)
  const [subPerkSelections, setSubPerkSelections] = useState<Map<number, number>>(() => {
    if (!initial) return new Map()
    // Row index isn't stored directly on the page — recover it by finding
    // which row of the (already-known) secondary style each saved perk
    // belongs to.
    const subStyle = catalog.styles.find((s) => s.id === initialPage?.subStyleId)
    const map = new Map<number, number>()
    if (subStyle) {
      for (const perkId of initial.subPerkIds) {
        const rowIndex = subStyle.slots.slice(1).findIndex((slot) => slot.perkIds.includes(perkId))
        if (rowIndex >= 0) map.set(rowIndex, perkId)
      }
    }
    return map
  })
  const [statShardIds, setStatShardIds] = useState<(number | null)[]>(initial?.statShardIds ?? [null, null, null])

  const primaryStyle = useMemo(() => catalog.styles.find((s) => s.id === primaryStyleId) ?? null, [catalog, primaryStyleId])
  const subStyle = useMemo(() => catalog.styles.find((s) => s.id === subStyleId) ?? null, [catalog, subStyleId])

  const subStyleOptions: RuneStyle[] = useMemo(() => {
    if (!primaryStyle) return []
    const allowed = primaryStyle.allowedSubStyles
    return catalog.styles.filter((s) => s.id !== primaryStyle.id && (allowed.length === 0 || allowed.includes(s.id)))
  }, [catalog, primaryStyle])

  function selectPrimaryStyle(style: RuneStyle): void {
    if (style.id === primaryStyleId) return
    setPrimaryStyleId(style.id)
    setKeystoneId(null)
    setPrimaryPerkIds([null, null, null])
    if (subStyleId === style.id) {
      setSubStyleId(null)
      setSubPerkSelections(new Map())
    }
  }

  function selectSubStyle(style: RuneStyle): void {
    if (style.id === subStyleId) return
    setSubStyleId(style.id)
    setSubPerkSelections(new Map())
  }

  function togglePrimaryPerk(rowIndex: number, perkId: number): void {
    setPrimaryPerkIds((prev) => {
      const next = [...prev]
      next[rowIndex] = perkId
      return next
    })
  }

  function toggleSubPerk(rowIndex: number, perkId: number): void {
    setSubPerkSelections((prev) => {
      const next = new Map(prev)
      if (next.get(rowIndex) === perkId) {
        next.delete(rowIndex)
        return next
      }
      if (!next.has(rowIndex) && next.size >= 2) return prev
      next.set(rowIndex, perkId)
      return next
    })
  }

  function setStatShard(rowIndex: number, perkId: number): void {
    setStatShardIds((prev) => {
      const next = [...prev]
      next[rowIndex] = perkId
      return next
    })
  }

  const primaryPerkIdsComplete = primaryPerkIds.every((id): id is number => id !== null)
  const statShardIdsComplete = statShardIds.every((id): id is number => id !== null)
  const canSave =
    name.trim().length > 0 &&
    primaryStyleId !== null &&
    keystoneId !== null &&
    primaryPerkIdsComplete &&
    subStyleId !== null &&
    subPerkSelections.size === 2 &&
    statShardIdsComplete

  function handleSave(): void {
    if (!canSave || !primaryStyleId || !subStyleId || keystoneId === null) return
    const now = Date.now()
    onSave({
      id: initialPage?.id ?? crypto.randomUUID(),
      name: name.trim(),
      championId: champion?.id ?? initialPage?.championId ?? null,
      championName: champion?.name ?? initialPage?.championName ?? null,
      primaryStyleId,
      subStyleId,
      selection: {
        keystoneId,
        primaryPerkIds: primaryPerkIds as [number, number, number],
        subPerkIds: [...subPerkSelections.values()] as [number, number],
        statShardIds: statShardIds as [number, number, number]
      },
      createdAt: initialPage?.createdAt ?? now,
      updatedAt: now
    })
  }

  const shardRows: { label: string; options: number[]; rowIndex: number }[] = [
    { label: 'Offense', options: mergeShardOptions(catalog.statShards.offense, statShardIds[0]), rowIndex: 0 },
    { label: 'Flex', options: mergeShardOptions(catalog.statShards.flex, statShardIds[1]), rowIndex: 1 },
    { label: 'Defense', options: mergeShardOptions(catalog.statShards.defense, statShardIds[2]), rowIndex: 2 }
  ]

  return (
    <div className={styles.editor}>
      <div className={styles.nameRow}>
        <input
          className={styles.nameInput}
          type="text"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder="Page name"
        />
      </div>

      <hr className={styles.divider} />

      <div className={styles.treesRow}>
        <div className={styles.treeColumn}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>Primary tree</p>
              <p className={primaryStyle ? `${styles.sectionValue} ${styles.sectionValueShown}` : styles.sectionValue}>
                {primaryStyle?.name}
              </p>
            </div>
            <div className={styles.row}>
              {catalog.styles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={style.id === primaryStyleId ? `${styles.slot} ${styles.slotSelected}` : styles.slot}
                  onClick={() => selectPrimaryStyle(style)}
                  title={style.name}
                >
                  <AssetIcon path={style.iconPath} label={style.name} size={32} />
                </button>
              ))}
            </div>
          </div>

          {primaryStyle ? (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <p className={styles.sectionLabel}>Keystone</p>
                  <p
                    className={
                      keystoneId !== null ? `${styles.sectionValue} ${styles.sectionValueShown}` : styles.sectionValue
                    }
                  >
                    {perkName(catalog, keystoneId)}
                  </p>
                </div>
                <div className={styles.row}>
                  {(primaryStyle.slots[0]?.perkIds ?? []).map((perkId) => (
                    <button
                      key={perkId}
                      type="button"
                      className={perkId === keystoneId ? `${styles.slot} ${styles.slotSelected}` : styles.slot}
                      onClick={() => setKeystoneId(perkId)}
                      title={perkName(catalog, perkId)}
                    >
                      <AssetIcon
                        path={perkIconPath(catalog, perkId)}
                        label={perkName(catalog, perkId)}
                        size={36}
                        round
                      />
                    </button>
                  ))}
                </div>
              </div>

              {primaryStyle.slots.slice(1).map((slot, rowIndex) => (
                <div className={styles.section} key={`primary-row-${rowIndex}`}>
                  <div className={styles.row}>
                    {slot.perkIds.map((perkId) => (
                      <button
                        key={perkId}
                        type="button"
                        className={
                          perkId === primaryPerkIds[rowIndex] ? `${styles.slot} ${styles.slotSelected}` : styles.slot
                        }
                        onClick={() => togglePrimaryPerk(rowIndex, perkId)}
                        title={perkName(catalog, perkId)}
                      >
                        <AssetIcon
                          path={perkIconPath(catalog, perkId)}
                          label={perkName(catalog, perkId)}
                          size={26}
                          round
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className={styles.hint}>Pick a primary tree to see its keystones and perks.</p>
          )}
        </div>

        <div className={styles.treeDivider} />

        <div className={styles.treeColumn}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>Secondary tree</p>
              <p className={subStyle ? `${styles.sectionValue} ${styles.sectionValueShown}` : styles.sectionValue}>
                {subStyle?.name}
              </p>
            </div>
            <div className={styles.row}>
              {subStyleOptions.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={style.id === subStyleId ? `${styles.slot} ${styles.slotSelected}` : styles.slot}
                  onClick={() => selectSubStyle(style)}
                  title={style.name}
                >
                  <AssetIcon path={style.iconPath} label={style.name} size={28} />
                </button>
              ))}
            </div>
          </div>

          {subStyle ? (
            <>
              <p className={styles.hint}>Pick one perk from any 2 of the 3 rows below.</p>
              {subStyle.slots.slice(1).map((slot, rowIndex) => {
                const rowSelection = subPerkSelections.get(rowIndex) ?? null
                const rowLocked = !subPerkSelections.has(rowIndex) && subPerkSelections.size >= 2
                return (
                  <div className={styles.section} key={`sub-row-${rowIndex}`}>
                    <div className={styles.row}>
                      {slot.perkIds.map((perkId) => (
                        <button
                          key={perkId}
                          type="button"
                          disabled={rowLocked}
                          className={[
                            styles.slot,
                            perkId === rowSelection ? styles.slotSelected : '',
                            rowLocked ? styles.slotLocked : ''
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => toggleSubPerk(rowIndex, perkId)}
                          title={perkName(catalog, perkId)}
                        >
                          <AssetIcon
                            path={perkIconPath(catalog, perkId)}
                            label={perkName(catalog, perkId)}
                            size={26}
                            round
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <p className={styles.hint}>Pick a secondary tree to see its perks.</p>
          )}
        </div>
      </div>

      <hr className={styles.divider} />

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Stat shards</p>
        {shardRows.map((row) =>
          row.options.length === 0 ? (
            <p className={styles.hint} key={row.label}>
              {row.label}: no options detected yet — build and save at least one page in the League Client's own
              rune editor, then reopen ULTK.
            </p>
          ) : (
            <div className={styles.row} key={row.label}>
              {row.options.map((perkId) => (
                <button
                  key={perkId}
                  type="button"
                  className={
                    perkId === statShardIds[row.rowIndex] ? `${styles.slot} ${styles.slotSelected}` : styles.slot
                  }
                  onClick={() => setStatShard(row.rowIndex, perkId)}
                  title={perkName(catalog, perkId)}
                >
                  <AssetIcon path={perkIconPath(catalog, perkId)} label={perkName(catalog, perkId)} size={22} round />
                </button>
              ))}
            </div>
          )
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.saveButton} disabled={!canSave} onClick={handleSave}>
          Save to book
        </button>
      </div>
    </div>
  )
}

function mergeShardOptions(discovered: number[], current: number | null): number[] {
  if (current === null || discovered.includes(current)) return discovered
  return [...discovered, current]
}
