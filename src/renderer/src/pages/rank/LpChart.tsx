import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { EmptyState } from '@renderer/components/EmptyState/EmptyState'
import { LineChart as LineChartIcon } from 'lucide-react'
import { formatRank, formatSignedNumber, rankScore } from '@renderer/lcu/rankFormat'
import type { RankSnapshot } from '../../../../shared/rank-history-types'
import styles from './LpChart.module.css'

const ACCENT = '#35d0a4'

interface LpChartProps {
  entries: RankSnapshot[]
}

interface ChartDatum extends RankSnapshot {
  score: number
  delta: number
}

function ChartTooltip({ active, payload }: TooltipContentProps): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload as ChartDatum

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>
        {new Date(point.timestamp).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
      <p className={styles.tooltipRank}>
        {formatRank(point)} · {point.leaguePoints} LP
      </p>
      <p className={point.delta > 0 ? styles.tooltipUp : point.delta < 0 ? styles.tooltipDown : styles.tooltipDelta}>
        {point.delta === 0 ? 'No change' : `${formatSignedNumber(point.delta)} LP`}
      </p>
    </div>
  )
}

export function LpChart({ entries }: LpChartProps): React.JSX.Element {
  if (entries.length < 2) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="Not enough history yet"
        description="Keep playing with ULTK open and your LP changes will start showing up here."
      />
    )
  }

  const data: ChartDatum[] = entries.map((entry, index) => {
    const previous = entries[index - 1]
    const score = rankScore(entry)
    const delta = previous ? score - rankScore(previous) : 0
    return { ...entry, score, delta }
  })

  const last = data[data.length - 1]

  return (
    <div className={styles.wrap}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value: number) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            minTickGap={40}
          />
          <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
          <Tooltip content={ChartTooltip} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="score"
            stroke={ACCENT}
            strokeWidth={2}
            strokeLinecap="round"
            fill={ACCENT}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: ACCENT, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <ReferenceDot x={last.timestamp} y={last.score} r={5} fill={ACCENT} stroke="var(--bg-surface)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
