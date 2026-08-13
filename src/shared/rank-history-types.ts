export type RankedQueueId = 'soloDuo' | 'flex'

export interface RankSnapshot {
  timestamp: number
  tier: string
  division: string
  leaguePoints: number
  wins: number
  losses: number
}

export interface RankHistory {
  soloDuo: RankSnapshot[]
  flex: RankSnapshot[]
}

export const EMPTY_RANK_HISTORY: RankHistory = { soloDuo: [], flex: [] }
