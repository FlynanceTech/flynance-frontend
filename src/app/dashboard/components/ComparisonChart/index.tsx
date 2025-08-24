'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RectangleProps,
  BarProps,
} from 'recharts'
import { categoriaCores } from '@/utils/categoriesIcone'
import type { Transaction } from '@/types/Transaction'
import { ChevronDown, Undo2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTransactionFilter } from '@/stores/useFilter'
import React, { useMemo, useRef, useEffect, useState, RefObject } from 'react'
import { useCategories } from '@/hooks/query/useCategory'
import type { CategoryResponse } from '@/services/category'
import DateRangeSelect, { DateFilter } from '../DateRangeSelect'
import { useTranscation } from '@/hooks/query/useTransaction'
import type { ActiveShape } from 'recharts/types/util/types'

interface ComparisonChartProps {
  userId: string
}

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format

type StackPos = 'bottom' | 'middle' | 'top'
type RectLike = Pick<RectangleProps, 'x' | 'y' | 'width' | 'height' | 'fill'>

/** Mede a largura do container para responsividade fina */
function useContainerWidth(): [number, RefObject<HTMLDivElement | null>] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState<number>(0)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(([entry]) => {
      const cw = entry.contentRect?.width ?? el.clientWidth
      setW(cw)
    })
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  return [w, ref]
}


/** Calcula tamanhos de barra a partir da largura útil do gráfico */
function computeBarSizing(
  containerW: number,
  yWidth: number,
  leftMargin: number,
  rightMargin: number,
  groups = 2 // "Receita" e "Despesas"
) {
  const plotW = Math.max(0, containerW - yWidth - leftMargin - rightMargin)
  const target = plotW / (groups * 2.5)
  const barSize = Math.round(Math.min(180, Math.max(80, target)))
  const barCategoryGap = Math.round(Math.min(48, Math.max(8, barSize * 0.8)))
  const barGap = Math.round(-barSize * 1.182)
  return { barSize, barCategoryGap, barGap }
}

export const renderGapShape = (
  position: StackPos,
  gap = 8,
  radius = 8
): ActiveShape<BarProps, SVGPathElement> => {
  const Shape: ActiveShape<BarProps, SVGPathElement> = (props: BarProps) => {
    const p = props as Partial<RectLike>
    const x = Number(p.x ?? 0)
    const y = Number(p.y ?? 0)
    const width = Number(p.width ?? 0)
    const height = Number(p.height ?? 0)
    const fill = p.fill as string | undefined

    if (height <= 0 || width <= 0) return <g />

    const wantedDh = position === 'middle' ? gap : gap / 2
    const dh = Math.min(height, wantedDh)
    const raw = height - dh

    const MIN_PX = 4
    const h = Math.max(MIN_PX, raw)

    const dy = position === 'bottom' ? 0 : dh / 2
    const inflate = h - Math.max(0, raw)
    const yAdj = y + dy - (inflate > 0 ? inflate : 0)

    return <rect x={x} y={yAdj} width={width} height={h} fill={fill} rx={radius} ry={radius} />
  }

  ;(Shape as React.ComponentType).displayName = `GapShape_${position}`
  return Shape
}

export default function ComparisonChart({ userId }: ComparisonChartProps) {
  const isMobile = useIsMobile()
  const [showLegend, setShowLegend] = useState(false)
  const [filter, setFilter] = useState<DateFilter>({ mode: 'days', days: 30 })
  const [containerW, containerRef] = useContainerWidth()

  const { transactionsQuery } = useTranscation({ userId })
  const transactions: Transaction[] = transactionsQuery.data || []
  const isLoading = transactionsQuery.isLoading

  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)

  const {
    categoriesQuery: { data: allCategories = [] },
  } = useCategories()

  const isDetalhado = selectedCategories.length === 1
  const categoriaSelecionada = isDetalhado ? selectedCategories[0] : null

  // --------- FILTRO DE DATA ---------
  const filteredTransactions = useMemo(() => {
    if (!transactions?.length) return []

    if (filter.mode === 'days') {
      const now = Date.now()
      const maxAgeMs = (filter.days ?? 30) * 24 * 60 * 60 * 1000
      return transactions.filter((t) => now - new Date(t.date).getTime() <= maxAgeMs)
    }

    const y = Number(filter.year)
    const m = Number(filter.month) - 1
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
    return transactions.filter((t) => {
      const d = new Date(t.date).getTime()
      return d >= start.getTime() && d <= end.getTime()
    })
  }, [transactions, filter])
  // -----------------------------------

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full animate-pulse space-y-4">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const receitas = filteredTransactions.filter((t) => t.type === 'INCOME')
  const despesas = filteredTransactions.filter((t) => t.type === 'EXPENSE')

  const totalReceita = receitas.reduce((acc, item) => acc + item.value, 0)

  const despesasPorCategoria = despesas.reduce((acc: Record<string, number>, item) => {
    acc[item.category.name] = (acc[item.category.name] || 0) + item.value
    return acc
  }, {})

  const dataChart = [
    { name: 'Receita', valor: totalReceita },
    { name: 'Despesas', ...despesasPorCategoria },
  ]

  const acumuladoPorCategoria = despesas.reduce((acc: Record<string, number>, item) => {
    acc[item.category.name] = (acc[item.category.name] || 0) + item.value
    return acc
  }, {})

  const dataAgrupada = Object.entries(acumuladoPorCategoria).map(([categoria, valor]) => ({
    categoria,
    valor,
  }))

  const categoriasDespesas = Object.keys(despesasPorCategoria)

  const dataDetalhada = filteredTransactions
    .filter((t) => t.category.id === categoriaSelecionada?.id)
    .map((t) => ({
      data: new Date(t.date).toLocaleDateString('pt-BR'),
      valor: t.value,
      description: t.description,
    }))

  const maxCategoriaLength =
    dataAgrupada.length > 0 ? Math.max(...dataAgrupada.map((d) => String(d.valor).length)) : 1

  const handleShowLegend = () => setShowLegend((v) => !v)

  const findColorCategory = (category: CategoryResponse | null) => {
    if (!category) return undefined
    const categoriaObj = allCategories.find((c) => c.id === category.id)
    return categoriaObj?.color
  }

  // ---------- Responsividade baseada na largura do container ----------
  const isXS = containerW < 420
  const isSM = containerW >= 420 && containerW < 640
  const tickFont = isXS ? 12 : 14
  const yWidth = isXS ? 56 : 72

  const leftMargin = categoriaSelecionada
    ? (isXS ? 20 : isSM ? 28 : 50)
    : Math.max(16, isXS ? 30 : isSM ? 35 : maxCategoriaLength * 3.5)
  const rightMargin = isXS ? 8 : 12

  const { barSize, barCategoryGap, barGap } = computeBarSizing(
    containerW,
    yWidth,
    leftMargin,
    rightMargin
  )
  // -------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className="bg-white p-4 rounded-xl shadow border border-gray-200 w-full h-full md:max-h-[450px]"
    >
      <div className="flex justify-between items-center px-4 pt-4">
        <div className="w-full flex flex-col gap-2 lg:flex-row lg:justify-between items-start">
          <div className="flex flex-col w-full">
            <h2 className="text-xl font-semibold text-gray-800">
              {categoriaSelecionada ? `Detalhes de ${categoriaSelecionada.name}` : 'Receita x Despesas'}
            </h2>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-4 md:hidden">
              Resumo das suas finanças{' '}
              <span>
                {filter.mode === 'days'
                  ? `nos últimos ${filter.days} dias`
                  : `de ${new Date(Number(filter.year), Number(filter.month) - 1).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}`}
              </span>
            </p>
          </div>
          {categoriaSelecionada ? (
            <button
              onClick={() => setSelectedCategories([])}
              className="text-sm text-[#333C4D] cursor-pointer flex gap-2 items-center"
            >
              Voltar
              <Undo2 className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex gap-4 items-center md:justify-end justify-between w-full mb-4">
              <button
                onClick={handleShowLegend}
                className="text-sm bg-[#CEF2E1] text-[#333C4D] px-4 py-2 rounded-full cursor-pointer flex gap-2 items-center"
              >
                <strong>Legenda</strong>
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-200 ${showLegend ? 'rotate-180' : ''}`}
                />
              </button>

              <div className="flex items-center gap-3">
                <DateRangeSelect value={filter} onChange={setFilter} />
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4 hidden md:block ml-4">
        Resumo das suas finanças{' '}
        <span>
          {filter.mode === 'days'
            ? `nos últimos ${filter.days} dias`
            : `de ${new Date(Number(filter.year), Number(filter.month) - 1).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}`}
        </span>
      </p>

      {showLegend && !categoriaSelecionada && (
        <div className="w-full md:max-w-[380px] max-w-80 flex flex-wrap gap-2 z-10 absolute bg-white py-2 shadow-md rounded-md">
          {categoriasDespesas.map((catName) => {
            const categoriaObj = allCategories.find((c) => c.name.trim() === catName.trim())
            if (!categoriaObj) return null
            const legendColor =
              categoriaObj.color ?? categoriaCores[catName as keyof typeof categoriaCores] ?? '#CBD5E1'
            return (
              <button
                key={catName}
                className="flex items-center gap-2 text-sm px-3 py-1 rounded-full cursor-pointer"
                onClick={() => setSelectedCategories([categoriaObj])}
              >
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: legendColor }} />
                <span className="text-gray-700">{catName}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-4 justify-center">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 300}>
          {categoriaSelecionada ? (
            <BarChart
              data={dataDetalhada}
              margin={{ top: 10, right: rightMargin, left: leftMargin, bottom: 0 }}
            >
              <XAxis dataKey="data" tick={{ fontSize: tickFont }} />
              <YAxis
                width={yWidth}
                tick={{ fontSize: tickFont }}
                tickFormatter={(v) => formatter(v as number)}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const item = payload[0].payload as { data: string; valor: number; description: string }
                    return (
                      <div className="bg-white border border-gray-200 rounded shadow p-3 text-sm space-y-1 max-w-xs">
                        <div className="font-semibold text-gray-800">{item.description}</div>
                        <div className="text-gray-600">Data: {item.data}</div>
                        <div className="text-gray-700 font-medium">Valor: {formatter(item.valor)}</div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="valor"
                fill={findColorCategory(categoriaSelecionada) || '#94a3b8'}
                barSize={barSize}
              />
            </BarChart>
          ) : (
            <BarChart
              data={dataChart}
              margin={{ top: 10, right: rightMargin, left: leftMargin, bottom: 0 }}
              barCategoryGap={barCategoryGap}
              barGap={barGap}
            >
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ textAnchor: 'middle', fontSize: tickFont }}
              />
              <YAxis
                width={yWidth}
                tickFormatter={(v) => formatter(v as number)}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: tickFont }}
              />
              {!isMobile && <Tooltip formatter={(v: number) => formatter(v)} cursor={false} />}

              {/* Receita */}
              <Bar dataKey="valor" fill="#22C55E" barSize={barSize} radius={[6, 6, 6, 6]} />

              {/* Despesas empilhadas */}
              {categoriasDespesas.map((categoriaName, idx) => {
                const categoriaObj = allCategories.find(
                  (c) => c.name.trim() === categoriaName.trim()
                )
                const barColor =
                  categoriaObj?.color ??
                  categoriaCores[categoriaName as keyof typeof categoriaCores] ??
                  '#CBD5E1'

                const len = categoriasDespesas.length
                const pos: StackPos = idx === 0 ? 'bottom' : idx === len - 1 ? 'top' : 'middle'

                return (
                  <Bar
                    key={categoriaName}
                    dataKey={categoriaName}
                    stackId="despesas"
                    fill={barColor}
                    barSize={barSize}
                    radius={[8, 8, 8, 8]}
                    shape={renderGapShape(pos, 2, 6)}
                  />
                )
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
