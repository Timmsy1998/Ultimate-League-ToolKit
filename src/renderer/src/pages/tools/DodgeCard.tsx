import { useState } from 'react'
import { DoorOpen } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { useLcu } from '@renderer/lcu/LcuContext'
import { PHASE_LABELS } from '@renderer/lcu/phaseLabels'
import toolStyles from '../Tools.module.css'

// Leaving pre-champ-select is the safe, well-established case. Leaving
// during champ select is a real dodge — it can cost LP and trigger a queue
// penalty — so it gets its own, more strongly-worded confirmation copy.
const DODGEABLE_PHASES = new Set(['Lobby', 'Matchmaking', 'ChampSelect'])

export function DodgeCard(): React.JSX.Element {
  const { status, phase } = useLcu()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isChampSelect = phase === 'ChampSelect'
  const canDodge = DODGEABLE_PHASES.has(phase)

  async function leaveLobby(): Promise<void> {
    setBusy(true)
    setErrorMessage(null)
    try {
      await window.api.lcu.leaveLobby()
      setConfirming(false)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to leave the lobby.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card icon={DoorOpen} title="Dodge">
      {status !== 'online' ? (
        <EmptyState icon={DoorOpen} title="Not connected" description="Open the League Client to use this." />
      ) : !canDodge ? (
        <EmptyState
          icon={DoorOpen}
          title={PHASE_LABELS[phase] ?? phase}
          description="Only available while in a lobby or champion select."
        />
      ) : (
        <div className={toolStyles.actionWrap}>
          <p className={toolStyles.description}>
            {isChampSelect
              ? 'Currently in champion select. Leaving now counts as a dodge.'
              : 'Currently in a lobby. Leave before matchmaking starts.'}
          </p>
          <button type="button" className={toolStyles.actionButton} onClick={() => setConfirming(true)}>
            {isChampSelect ? 'Dodge' : 'Leave lobby'}
          </button>
          {errorMessage ? <p className={toolStyles.description}>{errorMessage}</p> : null}
        </div>
      )}

      {confirming ? (
        <ConfirmDialog
          title={isChampSelect ? 'Dodge champion select' : 'Leave lobby'}
          message={
            isChampSelect
              ? "Dodging in champion select may cost LP and apply a queue-dodge penalty. This can't be undone once confirmed."
              : 'Leave the current lobby?'
          }
          confirmLabel={isChampSelect ? 'Dodge anyway' : 'Leave lobby'}
          danger={isChampSelect}
          busy={busy}
          onConfirm={() => void leaveLobby()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </Card>
  )
}
