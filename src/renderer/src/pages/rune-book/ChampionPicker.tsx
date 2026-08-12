import { useMemo, useState } from 'react'
import type { ChampionSummary } from '../../../../shared/lcu-types'
import { AssetIcon } from './AssetIcon'
import styles from './ChampionPicker.module.css'

interface ChampionPickerProps {
  champions: ChampionSummary[]
  selectedId: number | null
  pageCountByChampion: Map<number, number>
  onSelect: (champion: ChampionSummary) => void
}

export function ChampionPicker({
  champions,
  selectedId,
  pageCountByChampion,
  onSelect
}: ChampionPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return champions
    return champions.filter(
      (champion) => champion.name.toLowerCase().includes(q) || champion.alias.toLowerCase().includes(q)
    )
  }, [champions, query])

  return (
    <div className={styles.wrap}>
      <input
        className={styles.search}
        type="text"
        placeholder="Search champions…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul className={styles.list}>
        {filtered.map((champion) => {
          const count = pageCountByChampion.get(champion.id) ?? 0
          return (
            <li key={champion.id}>
              <button
                type="button"
                className={champion.id === selectedId ? `${styles.item} ${styles.active}` : styles.item}
                onClick={() => onSelect(champion)}
              >
                <span className={styles.icon}>
                  <AssetIcon path={champion.squarePortraitPath} label={champion.name} size={28} round />
                </span>
                <span className={styles.name}>{champion.name}</span>
                {count > 0 ? <span className={styles.count}>{count}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
