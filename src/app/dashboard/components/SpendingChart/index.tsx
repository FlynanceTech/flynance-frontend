'use client'

import { addDays, format, parseISO } from 'date-fns'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/utils/formatter'

type DataPoint = {
  date: string
  valor: number
  acumulado: number
}

type CustomTooltipProps = {
  active?: boolean
  payload?: {
    dataKey: keyof DataPoint
    value: number
    payload: DataPoint
  }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    return (
      <div className="rounded-xl border border-emerald-400/50 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-xl shadow-emerald-950/10 backdrop-blur dark:border-emerald-500/30 dark:bg-slate-900/95 dark:text-slate-100">
        <p>
          <strong>Data:</strong> {label && format(new Date(label), 'dd/MM')}
        </p>
        {payload[0].payload.valor ? (
          <p className="text-emerald-600 dark:text-emerald-400">
            <strong>Gasto diario:</strong> {formatCurrency(payload[0].payload.valor)}
          </p>
        ) : null}
      </div>
    )
  }
  return null
}

export function SpendingChart({
  data,
  spent,
  goal,
}: {
  data: { date: string; valor: number; acumulado: number }[]
  spent: number
  goal: number
}) {
  const t = useTranslations('controlDetailsPage')
  const locale = useLocale()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const percent = spent / goal
  const currencyPrefix = formatCurrency(0).replace(/[\d\s.,-]/g, '').trim() || 'R$'

  function formatYAxisTick(value: number) {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0
    const formattedValue = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(safeValue)

    return `${currencyPrefix} ${formattedValue}`
  }

  function getStrokeColor(p: number) {
    if (p > 0.9) return '#FF4D4F'
    if (p > 0.6) return '#FFB200'
    return '#3ECC89'
  }

  const chartData =
    data.length === 1
      ? [
          data[0],
          {
            date: addDays(new Date(), 1).toISOString().split('T')[0],
            valor: 0,
            acumulado: data[0].acumulado,
          },
        ]
      : data

  const axisColor = isDark ? '#94A3B8' : '#666'
  const axisLabelColor = isDark ? '#64748B' : '#6B7280'
  const dotFill = isDark ? '#020617' : '#fff'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 12, right: 12, bottom: 34, left: 0 }}
      >
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={getStrokeColor(percent)} stopOpacity={0.5} />
            <stop offset="95%" stopColor={getStrokeColor(percent)} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          stroke={axisColor}
          tickLine={false}
          axisLine={false}
          tickMargin={16}
          padding={{ left: 10, right: 10 }}
          tickFormatter={(date) => format(parseISO(date), 'dd/MM')}
          label={{
            value: t('xAxisLabel'),
            position: 'bottom',
            offset: 12,
            style: { fill: axisLabelColor, fontSize: 12 },
          }}
        />
        <YAxis
          stroke={axisColor}
          tickLine={false}
          axisLine={false}
          width={72}
          padding={{ bottom: 20, top: 20 }}
          tickFormatter={formatYAxisTick}
        />
        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="valor"
          name=""
          stroke={getStrokeColor(percent)}
          strokeWidth={3}
          fill="url(#colorValue)"
          activeDot={{ r: 6, stroke: getStrokeColor(percent), strokeWidth: 2, fill: dotFill }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
