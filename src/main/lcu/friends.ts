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

// groupId is best-effort metadata, not a validity requirement — most
// players never bother sorting friends into custom chat groups, so the LCU
// leaves groupId null/absent for the (common) ungrouped case. Requiring a
// string here used to drop every ungrouped friend from the list entirely,
// which for most accounts meant nearly all of them — showing "no friends
// online" even with friends actually online.
// The LCU's own schema (LolChatFriendResource/LolChatGroupResource) has
// both groupId and the group's id as a JSON *number* (int32), never a
// string — confirmed against the community-maintained LCU OpenAPI schema
// (github.com/MingweiSamuel/lcu-schema), not guessed. The old strict
// typeof === 'string' checks here rejected every real value, which is why
// fetchFriendGroups() always came back empty and every friend fell into
// "Ungrouped" regardless of their actual custom groups.
function toFriendSummary(raw: unknown): FriendSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as RawFriend
  if (typeof v.summonerId !== 'number' || typeof v.name !== 'string') return null
  if (typeof v.availability !== 'string') return null

  return {
    summonerId: v.summonerId,
    name: v.name,
    groupId: typeof v.groupId === 'number' ? String(v.groupId) : typeof v.groupId === 'string' ? v.groupId : '',
    availability: v.availability
  }
}

function toFriendGroup(raw: unknown): FriendGroup | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as RawFriendGroup
  if (typeof v.name !== 'string') return null
  if (typeof v.id !== 'number' && typeof v.id !== 'string') return null
  return { id: String(v.id), name: v.name }
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
