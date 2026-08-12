const TIER_ORDER = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER'
]

const DIVISION_ORDER: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 }

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

export function formatRank(entry: { tier: string; division: string } | null): string {
  if (!entry || !entry.tier) return 'Unranked'
  const division = entry.division && entry.division !== 'NA' ? ` ${entry.division}` : ''
  return `${capitalize(entry.tier)}${division}`
}

// LP alone isn't comparable across a promotion (Gold IV 90 LP -> Gold III
// 0 LP reads as a cliff, not progress) — this folds tier + division + LP
// into one monotonic-ish number so a line chart actually shows climbing.
// Divisions only apply below Master; apex tiers (Master+) have none, so
// they're treated as division 0 within a wider tier step.
export function rankScore(entry: { tier: string; division: string; leaguePoints: number }): number {
  const tierIndex = TIER_ORDER.indexOf(entry.tier.toUpperCase())
  if (tierIndex < 0) return entry.leaguePoints
  const divisionIndex = DIVISION_ORDER[entry.division.toUpperCase()] ?? 0
  return tierIndex * 400 + divisionIndex * 100 + entry.leaguePoints
}

export function formatSignedNumber(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}
