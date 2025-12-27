'use client'

import React, { useMemo, useState } from 'react'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatBRL = (n: number) => currency.format(Number.isFinite(n) ? n : 0)

function buildTicks(maxValue: number, tickCount = 5) {
  const safeMax = maxValue > 0 ? maxValue : 1
  const step = safeMax / (tickCount - 1)
  return Array.from({ length: tickCount }, (_, i) => step * i)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export type BarCompareIncome = {
  label: string
  value: number
  color: string
}

export type BarCompareSegment = {
  key: string
  label: string
  value: number
  color: string
}

export function BarCompareChart({
  containerW,
  height = 360,
  yAxisWidth = 72,
  tickCount = 5,
  income,
  stackedLabel = 'Despesas',
  segments,
}: {
  containerW?: number
  height?: number
  yAxisWidth?: number
  tickCount?: number
  income: BarCompareIncome
  stackedLabel?: string
  segments: BarCompareSegment[] // recomendado: ordenado desc (maior->menor)
}) {
  const labelRowH = 26
  const plotH = Math.max(220, height - labelRowH)

  const totalStack = useMemo(() => segments.reduce((acc, s) => acc + (s.value || 0), 0), [segments])
  const maxTotal = Math.max(income.value || 0, totalStack || 0, 1)
  const ticks = useMemo(() => buildTicks(maxTotal, tickCount), [maxTotal, tickCount])

  const incomePct = (income.value / maxTotal) * 100
  const stackPct = (totalStack / maxTotal) * 100

  // largura fixa usada APENAS em >= sm (desktop/tablet)
  const incomeBarW = clamp(Math.round((containerW || 800) * 0.22), 120, 220)

  // CSS var para Tailwind usar em sm:w-[var(--income-w)]
  const cssVars = { ['--income-w' as any]: `${incomeBarW}px` } as React.CSSProperties

  const shouldShowLabel = (segValue: number) => {
    const stackHeightPx = (stackPct / 100) * plotH
    const segPx = (segValue / (totalStack || 1)) * stackHeightPx
    return segPx >= 24
  }

  return (
    <div className="flex gap-4" style={cssVars}>
      {/* Y axis */}
      <div className="shrink-0" style={{ width: yAxisWidth }}>
        <div className="flex flex-col justify-between text-[11px] text-slate-500" style={{ height: plotH }}>
          {ticks
            .slice()
            .reverse()
            .map((t, idx) => (
              <div key={idx} className="leading-none">
                {formatBRL(t)}
              </div>
            ))}
        </div>
      </div>

      {/* Plot + X labels */}
      <div className="min-w-0 flex-1">
        <div className="grid" style={{ gridTemplateRows: `${plotH}px ${labelRowH}px`, height }}>
          {/* PLOT */}
          <div className="relative">
            {/* grid lines */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {ticks
                .slice()
                .reverse()
                .map((_, idx) => (
                  <div key={idx} className="border-t border-slate-200" />
                ))}
            </div>

            {/* BARS: mobile = colunas iguais (flex-1), desktop = receita fixa */}
            <div className="relative flex h-full items-end gap-3 sm:gap-5">
              {/* Income */}
              <div className="relative h-full flex-1 sm:flex-none sm:w-[var(--income-w)]">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-sm"
                  style={{ height: `${incomePct}%`, backgroundColor: income.color }}
                  title={`${income.label}: ${formatBRL(income.value)}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">{formatBRL(income.value)}</span>
                  </div>
                </div>
              </div>

              {/* Stacked */}
              <div className="relative h-full flex-1">
                <div
                  className="absolute inset-x-0 bottom-0 overflow-hidden rounded-sm"
                  style={{ height: `${stackPct}%` }}
                  title={`${stackedLabel}: ${formatBRL(totalStack)}`}
                >
                  <div className="flex h-full w-full flex-col-reverse">
                    {segments.map((seg) => {
                      const segPct = (seg.value / (totalStack || 1)) * 100
                      return (
                        <div
                          key={seg.key}
                          className="relative flex w-full items-center justify-center"
                          style={{ height: `${segPct}%`, backgroundColor: seg.color }}
                          title={`${seg.label}: ${formatBRL(seg.value)}`}
                        >
                          {shouldShowLabel(seg.value) ? (
                            <span className="text-sm font-semibold text-white">{formatBRL(seg.value)}</span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* X LABELS: mesma regra de largura */}
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex-1 text-center text-xs text-slate-600 sm:flex-none sm:w-[var(--income-w)]">
              Receita
            </div>
            <div className="flex-1 text-center text-xs text-slate-600">{stackedLabel}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export type DetailBarItem = {
  dateLabel: string
  value: number
  description: string
}

export function BarDetailChart({
  height = 320,
  yAxisWidth = 72,
  tickCount = 5,
  color = '#94a3b8',
  items,
}: {
  height?: number
  yAxisWidth?: number
  tickCount?: number
  color?: string
  items: DetailBarItem[]
}) {
  const [hovered, setHovered] = useState<DetailBarItem | null>(null)

  if (!items.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Nenhuma transação encontrada para esta categoria no período selecionado.
      </div>
    )
  }

  const maxV = Math.max(...items.map((i) => i.value || 0), 1)
  const ticks = buildTicks(maxV, tickCount)

  const barAreaH = Math.max(180, height - 24)

  return (
    <div className="flex gap-4">
      <div className="shrink-0" style={{ width: yAxisWidth }}>
        <div className="flex h-full flex-col justify-between text-[11px] text-slate-500" style={{ height }}>
          {ticks
            .slice()
            .reverse()
            .map((t, idx) => (
              <div key={idx} className="leading-none">
                {formatBRL(t)}
              </div>
            ))}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks
              .slice()
              .reverse()
              .map((_, idx) => (
                <div key={idx} className="border-t border-slate-200" />
              ))}
          </div>

          {hovered ? (
            <div className="absolute right-2 top-2 z-10 max-w-[320px] rounded-md border border-slate-200 bg-white p-3 text-sm shadow">
              <div className="font-semibold text-slate-800">{hovered.description}</div>
              <div className="text-slate-600">Data: {hovered.dateLabel}</div>
              <div className="font-medium text-slate-700">Valor: {formatBRL(hovered.value)}</div>
            </div>
          ) : null}

          <div className="relative h-full overflow-x-auto pb-2">
            <div className="flex h-full items-end gap-2">
              {items.map((it, idx) => {
                const hPx = Math.max(2, (it.value / maxV) * barAreaH)

                return (
                  <div key={idx} className="flex h-full w-[44px] flex-col items-center justify-end">
                    <div
                      className="w-full rounded-sm"
                      style={{ height: `${hPx}px`, backgroundColor: color }}
                      onMouseEnter={() => setHovered(it)}
                      onMouseLeave={() => setHovered(null)}
                      title={`${it.description} • ${it.dateLabel} • ${formatBRL(it.value)}`}
                    />
                    <div className="mt-1 w-full truncate text-center text-[10px] text-slate-600">{it.dateLabel}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
