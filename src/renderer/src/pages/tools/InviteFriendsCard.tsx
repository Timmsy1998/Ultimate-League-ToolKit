import { useMemo, useState } from 'react'
import { RefreshCw, UserPlus } from 'lucide-react'
import { Card } from '@renderer/components/Card/Card'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { useLcu } from '@renderer/lcu/LcuContext'
import type { FriendGroup, FriendSummary } from '../../../../shared/lcu-types'
import toolStyles from '../Tools.module.css'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

const UNGROUPED_ID = '__ungrouped__'

function isOnline(friend: FriendSummary): boolean {
  return friend.availability !== 'offline'
}

function groupLabel(groupId: string, groups: FriendGroup[]): string {
  if (groupId === UNGROUPED_ID) return 'Friends'
  return groups.find((group) => group.id === groupId)?.name ?? 'Friends'
}

export function InviteFriendsCard(): React.JSX.Element {
  const { status, phase } = useLcu()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [groups, setGroups] = useState<FriendGroup[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showOffline, setShowOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const canInvite = status === 'online' && phase === 'Lobby'

  async function load(): Promise<void> {
    setLoadState('loading')
    try {
      const [friendList, groupList] = await Promise.all([window.api.lcu.getFriends(), window.api.lcu.getFriendGroups()])
      setFriends(friendList)
      setGroups(groupList)
      setLoadState('loaded')
    } catch {
      setLoadState('error')
    }
  }

  const visibleFriends = useMemo(() => (showOffline ? friends : friends.filter(isOnline)), [friends, showOffline])

  const friendsByGroup = useMemo(() => {
    const map = new Map<string, FriendSummary[]>()
    for (const friend of visibleFriends) {
      const key = friend.groupId || UNGROUPED_ID
      const list = map.get(key) ?? []
      list.push(friend)
      map.set(key, list)
    }
    return map
  }, [visibleFriends])

  function toggleFriend(summonerId: number): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(summonerId)) next.delete(summonerId)
      else next.add(summonerId)
      return next
    })
  }

  function selectGroup(groupFriends: FriendSummary[]): void {
    setSelected((prev) => {
      const next = new Set(prev)
      groupFriends.forEach((friend) => next.add(friend.summonerId))
      return next
    })
  }

  async function inviteSelected(): Promise<void> {
    if (selected.size === 0) return
    setBusy(true)
    setInviteError(null)
    try {
      await window.api.lcu.inviteFriends({ summonerIds: Array.from(selected) })
      setSelected(new Set())
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invites.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card icon={UserPlus} title="Invite Friends">
      {status !== 'online' ? (
        <EmptyState icon={UserPlus} title="Not connected" description="Open the League Client to invite friends." />
      ) : !canInvite ? (
        <EmptyState icon={UserPlus} title="No active lobby" description="Create or join a lobby to invite friends." />
      ) : loadState === 'idle' ? (
        <div className={toolStyles.actionWrap}>
          <p className={toolStyles.description}>Invite friends and friend groups to your lobby.</p>
          <button type="button" className={toolStyles.actionButton} onClick={() => void load()}>
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
            Load friends
          </button>
        </div>
      ) : loadState === 'loading' ? (
        <EmptyState icon={RefreshCw} title="Loading…" />
      ) : loadState === 'error' ? (
        <EmptyState icon={UserPlus} title="Couldn't load friends" description="Try again in a moment." />
      ) : friendsByGroup.size === 0 ? (
        <EmptyState icon={UserPlus} title="No friends to show" description="Try showing offline friends too." />
      ) : (
        <>
          <label className={toolStyles.description}>
            <input type="checkbox" checked={showOffline} onChange={(e) => setShowOffline(e.target.checked)} />{' '}
            Show offline friends
          </label>
          <ul className={toolStyles.pageList}>
            {Array.from(friendsByGroup.entries()).map(([groupId, groupFriends]) => (
              <li key={groupId} className={toolStyles.pageItem}>
                <div className={toolStyles.pageNameRow}>
                  <span className={toolStyles.pageName}>{groupLabel(groupId, groups)}</span>
                  <button type="button" className={toolStyles.actionButton} onClick={() => selectGroup(groupFriends)}>
                    Select all
                  </button>
                </div>
                {groupFriends.map((friend) => (
                  <label key={friend.summonerId} className={toolStyles.pageStyles}>
                    <input
                      type="checkbox"
                      checked={selected.has(friend.summonerId)}
                      onChange={() => toggleFriend(friend.summonerId)}
                    />{' '}
                    {friend.name} {isOnline(friend) ? '' : '(offline)'}
                  </label>
                ))}
              </li>
            ))}
          </ul>
          <div className={toolStyles.actionWrap}>
            <button
              type="button"
              className={toolStyles.actionButton}
              disabled={selected.size === 0 || busy}
              onClick={() => void inviteSelected()}
            >
              {busy ? 'Inviting…' : `Invite selected (${selected.size})`}
            </button>
            {inviteError ? <p className={toolStyles.description}>{inviteError}</p> : null}
          </div>
        </>
      )}
    </Card>
  )
}
