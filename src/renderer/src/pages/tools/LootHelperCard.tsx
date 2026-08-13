import { useState } from 'react'
import { Gift, RefreshCw } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { useLcu } from '@renderer/lcu/LcuContext'
import type { LootItem, LootSummary } from '../../../../shared/lcu-types'
import toolStyles from '../Tools.module.css'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

function isDisenchantable(item: LootItem): boolean {
  return item.disenchantRecipeName !== null && item.disenchantValue !== null
}

function disenchantTotal(item: LootItem): number {
  return (item.disenchantValue ?? 0) * item.count
}

export function LootHelperCard(): React.JSX.Element {
  const { status } = useLcu()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [loot, setLoot] = useState<LootSummary | null>(null)
  const [confirmItem, setConfirmItem] = useState<LootItem | null>(null)
  const [busyLootId, setBusyLootId] = useState<string | null>(null)

  async function loadLoot(): Promise<void> {
    setLoadState('loading')
    try {
      const result = await window.api.lcu.getLoot()
      setLoot(result)
      setLoadState('loaded')
    } catch {
      setLoadState('error')
    }
  }

  async function disenchant(item: LootItem): Promise<void> {
    if (!item.disenchantRecipeName) return
    setBusyLootId(item.lootId)
    try {
      const result = await window.api.lcu.disenchantLoot({
        recipeName: item.disenchantRecipeName,
        lootIds: Array(item.count).fill(item.lootId)
      })
      setLoot(result)
      setConfirmItem(null)
    } catch {
      // The LCU call failing means nothing was actually disenchanted — leave
      // the confirm dialog open with the existing inventory rather than
      // silently closing on a failure the user didn't see.
    } finally {
      setBusyLootId(null)
    }
  }

  return (
    <Card icon={Gift} title="Loot Helper">
      {status !== 'online' ? (
        <EmptyState icon={Gift} title="Not connected" description="Open the League Client to manage your loot." />
      ) : loadState === 'idle' ? (
        <div className={toolStyles.actionWrap}>
          <p className={toolStyles.description}>View your loot and disenchant shards without leaving ULTK.</p>
          <button type="button" className={toolStyles.actionButton} onClick={() => void loadLoot()}>
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
            Load loot
          </button>
        </div>
      ) : loadState === 'loading' ? (
        <EmptyState icon={RefreshCw} title="Loading…" />
      ) : loadState === 'error' ? (
        <EmptyState icon={Gift} title="Couldn't load loot" description="Try again in a moment." />
      ) : !loot || loot.items.length === 0 ? (
        <EmptyState icon={Gift} title="No loot to show" />
      ) : (
        <>
          {loot.currencies.length > 0 ? (
            <div className={toolStyles.statGrid}>
              {loot.currencies.map((currency) => (
                <div key={currency.name} className={toolStyles.statItem}>
                  <span className={toolStyles.statLabel}>{currency.name}</span>
                  <span className={toolStyles.statValue}>{currency.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : null}
          <ul className={toolStyles.pageList}>
            {loot.items.map((item) => (
              <li key={item.lootId} className={toolStyles.pageItem}>
                <div className={toolStyles.pageNameRow}>
                  <span className={toolStyles.pageName}>{item.localizedName}</span>
                  <span className={toolStyles.pageBadge}>x{item.count}</span>
                </div>
                {isDisenchantable(item) ? (
                  <button
                    type="button"
                    className={toolStyles.actionButton}
                    disabled={busyLootId === item.lootId}
                    onClick={() => setConfirmItem(item)}
                  >
                    Disenchant for {disenchantTotal(item).toLocaleString()} {item.disenchantLootName ?? 'essence'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      {confirmItem ? (
        <ConfirmDialog
          title="Disenchant loot"
          message={`Disenchant ${confirmItem.count}x ${confirmItem.localizedName} for ${disenchantTotal(confirmItem).toLocaleString()} ${confirmItem.disenchantLootName ?? 'essence'}? This can't be undone.`}
          confirmLabel="Disenchant"
          danger
          busy={busyLootId === confirmItem.lootId}
          onConfirm={() => void disenchant(confirmItem)}
          onCancel={() => setConfirmItem(null)}
        />
      ) : null}
    </Card>
  )
}
