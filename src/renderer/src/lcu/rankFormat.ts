import type { RankedEntry } from '../../../shared/lcu-types'

const TIER_COLORS: Record<string, string> = {
  IRON: '#6b6459',
  BRONZE: '#a56a3f',
  SILVER: '#9aa4b2',
  GOLD: '#d7ad3f',
  PLATINUM: '#3fbfa0',
  EMERALD: '#33ab6f',
  DIAMOND: '#5b9bd9',
  MASTER: '#a86ce0',
  GRANDMASTER: '#e0574f',
  CHALLENGER: '#f2c75c'
}

export function tierColor(tier: string): string | undefined {
  return TIER_COLORS[tier.toUpperCase()]
}

function capitalize(value: string): string {
  if (!value) return ''
  return value[0] + value.slice(1).toLowerCase()
}

export function formatRank(entry: RankedEntry | null): string {
  if (!entry || !entry.tier) return 'Unranked'
  const division = entry.division && entry.division !== 'NA' ? ` ${entry.division}` : ''
  return `${capitalize(entry.tier)}${division}`
}
