import type { FriendGroup, FriendSummary } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

interface RawFriend {
  summonerId?: unknown
  name?: unknown
  groupId?: unknown
  availability?: unknown
}

interface RawFriendGroup {
  id?: unknown
  name?: unknown
}

function toFriendSummary(raw: unknown): FriendSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as RawFriend
  if (typeof v.summonerId !== 'number' || typeof v.name !== 'string') return null
  if (typeof v.groupId !== 'string' || typeof v.availability !== 'string') return null

  return { summonerId: v.summonerId, name: v.name, groupId: v.groupId, availability: v.availability }
}

function toFriendGroup(raw: unknown): FriendGroup | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as RawFriendGroup
  if (typeof v.id !== 'string' || typeof v.name !== 'string') return null
  return { id: v.id, name: v.name }
}

export async function fetchFriends(client: LcuHttpClient): Promise<FriendSummary[]> {
  const raw = await client.get<unknown>('/lol-chat/v1/friends')
  if (!Array.isArray(raw)) return []
  return raw.map(toFriendSummary).filter((friend): friend is FriendSummary => friend !== null)
}

export async function fetchFriendGroups(client: LcuHttpClient): Promise<FriendGroup[]> {
  const raw = await client.get<unknown>('/lol-chat/v1/friend-groups')
  if (!Array.isArray(raw)) return []
  return raw.map(toFriendGroup).filter((group): group is FriendGroup => group !== null)
}

export async function inviteFriends(client: LcuHttpClient, summonerIds: number[]): Promise<void> {
  await client.post(
    '/lol-lobby/v2/lobby/invitations',
    summonerIds.map((toSummonerId) => ({ toSummonerId }))
  )
}
