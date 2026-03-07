'use client'

import { addDays, format, parseISO } from 'date-fns'
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
      <div className="rounded-lg border border-secondary bg-[#3ECC8980] px-4 py-2 text-sm text-white shadow">
        <p>
          <strong>Data:</strong> {label && format(new Date(label), 'dd/MM')}
        </p>
        {payload[0].payload.valor ? (
          <p>
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
  const percent = spent / goal

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

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={getStrokeColor(percent)} stopOpacity={0.5} />
            <stop offset="95%" stopColor={getStrokeColor(percent)} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          stroke="#666"
          tickLine={false}
          axisLine={false}
          padding={{ left: 10, right: 10 }}
          tickFormatter={(date) => format(parseISO(date), 'dd/MM')}
        />
        <YAxis stroke="#666" tickLine={false} axisLine={false} padding={{ bottom: 20, top: 20 }} />
        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="valor"
          name=""
          stroke={getStrokeColor(percent)}
          strokeWidth={3}
          fill="url(#colorValue)"
          activeDot={{ r: 6, stroke: getStrokeColor(percent), strokeWidth: 2, fill: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
