import type { MatchSummary } from '../../shared/lcu-types'
import type { LcuHttpClient } from './http-client'

interface RawParticipant {
  participantId: number
  stats?: { win?: boolean }
}

interface RawParticipantIdentity {
  participantId: number
  player?: { summonerId?: number }
}

interface RawGame {
  gameId: number
  gameCreation: number
  gameDuration: number
  gameMode: string
  participants?: RawParticipant[]
  participantIdentities?: RawParticipantIdentity[]
}

interface RawMatchHistoryResponse {
  games?: { games?: RawGame[] }
}

function isRawMatchHistoryResponse(value: unknown): value is RawMatchHistoryResponse {
  return !!value && typeof value === 'object'
}

// The LCU's match history shape isn't formally documented and has shifted
// across client versions — anything unexpected here is skipped rather than
// guessed at, so a malformed or partial entry never shows a made-up result.
export async function fetchMatchHistory(
  client: LcuHttpClient,
  summonerId: number,
  count: number
): Promise<MatchSummary[]> {
  const endIndex = Math.max(0, count - 1)
  const raw = await client.get<unknown>(
    `/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=${endIndex}`
  )
  if (!isRawMatchHistoryResponse(raw)) return []

  const games = raw.games?.games ?? []
  const summaries: MatchSummary[] = []

  for (const game of games) {
    if (typeof game.gameId !== 'number' || typeof game.gameCreation !== 'number') continue

    const identity = game.participantIdentities?.find((entry) => entry.player?.summonerId === summonerId)
    const participant = identity
      ? game.participants?.find((entry) => entry.participantId === identity.participantId)
      : undefined
    const win = typeof participant?.stats?.win === 'boolean' ? participant.stats.win : null

    summaries.push({
      gameId: game.gameId,
      queueType: typeof game.gameMode === 'string' ? game.gameMode : 'Unknown',
      win,
      durationSeconds: typeof game.gameDuration === 'number' ? game.gameDuration : 0,
      playedAt: game.gameCreation
    })
  }

  return summaries
}
