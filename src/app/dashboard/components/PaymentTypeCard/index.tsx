// src/components/cards/PaymentTypeCard.tsx
'use client'

import { usePaymentTypeSummary } from '@/hooks/query/usePaymentAnalytics'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import React from 'react'

const LABEL: Record<string, string> = {
  DEBIT_CARD: 'Débito',
  CREDIT_CARD: 'Crédito',
  PIX: 'Pix',
  MONEY: 'Dinheiro',
}

type Row = {
  name: string
  total: number
  share: number
  delta: number
  color: string
  key: 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX' | 'MONEY'
}

const COLORS: Record<Row['key'], string> = {
  DEBIT_CARD: '#16A34A',   // verde
  CREDIT_CARD: '#3B82F6',  // azul
  PIX: '#06B6D4',          // ciano
  MONEY: '#F59E0B',        // amarelo
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function PaymentTypeCard() {
  const isMobile = useIsMobile()
  const { data, isLoading } = usePaymentTypeSummary({ mode: 'days', days: 30 })

  if (isLoading || !data) {
    return <div className="bg-white p-6 rounded-xl border shadow animate-pulse h-[260px]" />
  }

  const rows: Row[] = data.buckets
    .slice()
    .sort((a, b) => b.total - a.total)
    .map((b) => ({
      key: b.type as Row['key'],
      name: LABEL[b.type] ?? b.type,
      total: Number(b.total.toFixed(2)),
      share: Number(b.sharePct.toFixed(1)),
      delta: Number(b.deltaPct.toFixed(1)),
      color: COLORS[b.type as Row['key']] ?? '#94a3b8',
    }))

  const startStr = new Date(data.range.start).toLocaleDateString('pt-BR')
  const endStr = new Date(data.range.end).toLocaleDateString('pt-BR')

  // margem à direita maior para caber rótulos (evita “comer” a legenda/labels)
  const rightMargin = isMobile ? 12 : 88

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-bold text-gray-800">Gasto por forma de pagamento</h3>
        <span className="text-sm text-gray-500">período {startStr} – {endStr}</span>
      </div>

      {/* ======== MOBILE: Doughnut ======== */}
      {isMobile ? (
        <>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="total"
                  nameKey="name"
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                  /* label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} */
                >
                  {rows.map((r) => (
                    <Cell key={r.key} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chips/legenda compacta */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {rows.map((r) => (
              <div key={r.key} className="border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm text-xs" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </span>
                <div className=" font-semibold">{brl(r.total)}</div>
                </div>
                  <div className="text-xs text-gray-500 mt-1">{r.share}% de participação</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ======== DESKTOP: Barras + 100% empilhada ======== */
        <>
          {/* Barras horizontais (total) */}
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={rows}
                margin={{ top: 8, right: rightMargin, left: 0, bottom: 0 }}
                barCategoryGap={12}
              >
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={brl}
                />
                <YAxis
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  dataKey="name"
                  width={90}
                />
                <Tooltip formatter={(v: number, k) => (k === 'total' ? brl(v) : `${v}%`)} cursor={false} />
                <Bar dataKey="total" radius={[6, 6, 6, 6]}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill={r.color} />
                  ))}
                  <LabelList
                    dataKey="total"
                    position="right"
                    offset={10}
                    formatter={(v: number) => brl(v)}
                    className="fill-gray-700"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.key} className="border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </span>
                <div className="font-semibold">{brl(r.total)}</div>
                </div>
                  <div className="text-xs mt-1 text-gray-500">{r.share}% de participação</div>
               
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
