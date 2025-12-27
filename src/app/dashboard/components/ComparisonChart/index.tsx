'use client'

import React, { useMemo, useRef, useEffect, useState, RefObject } from 'react'
import { ChevronDown, Undo2 } from 'lucide-react'

import { categoriaCores } from '@/utils/categoriesIcone'
import type { Transaction } from '@/types/Transaction'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTransactionFilter } from '@/stores/useFilter'
import { useCategories } from '@/hooks/query/useCategory'
import type { CategoryResponse } from '@/services/category'
import DateRangeSelect, { DateFilter } from '../DateRangeSelect'
import { useTranscation } from '@/hooks/query/useTransaction'

import { BarCompareChart, BarDetailChart } from './barChart'

interface ComparisonChartProps {
  userId: string
}

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

  const receitas = useMemo(() => filteredTransactions.filter((t) => t.type === 'INCOME'), [filteredTransactions])
  const despesas = useMemo(() => filteredTransactions.filter((t) => t.type === 'EXPENSE'), [filteredTransactions])

  const totalReceita = useMemo(() => receitas.reduce((acc, item) => acc + item.value, 0), [receitas])

  const despesasPorCategoria = useMemo(() => {
    return despesas.reduce((acc: Record<string, number>, item) => {
      acc[item.category.name] = (acc[item.category.name] || 0) + item.value
      return acc
    }, {})
  }, [despesas])

  const categoriasDespesas = useMemo(() => Object.keys(despesasPorCategoria), [despesasPorCategoria])

  const segmentsForChart = useMemo(() => {
    return Object.entries(despesasPorCategoria)
      .map(([categoriaName, valor]) => {
        const categoriaObj = allCategories.find((c) => c.name.trim() === categoriaName.trim())
        const color =
          categoriaObj?.color ??
          categoriaCores[categoriaName as keyof typeof categoriaCores] ??
          '#CBD5E1'

        return {
          key: categoriaObj?.id ?? categoriaName,
          label: categoriaName,
          value: valor,
          color,
        }
      })
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [despesasPorCategoria, allCategories])

  const incomeForChart = useMemo(() => {
    return {
      label: 'Renda',
      value: totalReceita,
      color: '#22C55E',
    }
  }, [totalReceita])

  const dataDetalhada = useMemo(() => {
    if (!categoriaSelecionada) return []
    return filteredTransactions
      .filter((t) => t.category.id === categoriaSelecionada.id)
      .map((t) => ({
        dateLabel: new Date(t.date).toLocaleDateString('pt-BR'),
        value: t.value,
        description: t.description,
      }))
  }, [filteredTransactions, categoriaSelecionada])

  const findColorCategory = (category: CategoryResponse | null) => {
    if (!category) return undefined
    const categoriaObj = allCategories.find((c) => c.id === category.id)
    return categoriaObj?.color
  }

  const handleShowLegend = () => setShowLegend((v) => !v)

  const isXS = containerW < 420
  const yWidth = isXS ? 56 : 72

  if (isLoading) {
    return (
      <div className="w-full animate-pulse space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow">
        <div className="h-5 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-100" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full rounded bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-full w-full rounded-xl border border-gray-200 bg-white p-4 shadow">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex w-full flex-col items-start gap-2 lg:flex-row lg:justify-between">
          <div className="flex w-full flex-col">
            <h2 className="text-xl font-semibold text-gray-800">
              {categoriaSelecionada ? `Detalhes de ${categoriaSelecionada.name}` : 'Receita x Despesas'}
            </h2>
          </div>

          {categoriaSelecionada ? (
            <button
              onClick={() => setSelectedCategories([])}
              className="flex cursor-pointer items-center gap-2 text-sm text-[#333C4D]"
            >
              Voltar
              <Undo2 className="h-5 w-5" />
            </button>
          ) : (
            <div className="mb-4 flex w-full items-center justify-between gap-4 md:justify-end">
              <button
                onClick={handleShowLegend}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-secondary/30 px-4 py-2 text-sm text-[#333C4D]"
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

      <p className="mb-4 ml-4 text-sm text-gray-500">
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
        <div className="absolute z-10 w-full max-w-80 flex-wrap gap-2 rounded-md bg-white py-2 shadow-md md:max-w-[380px]">
          {categoriasDespesas.map((catName) => {
            const categoriaObj = allCategories.find((c) => c.name.trim() === catName.trim())
            if (!categoriaObj) return null

            const legendColor =
              categoriaObj.color ?? categoriaCores[catName as keyof typeof categoriaCores] ?? '#CBD5E1'

            return (
              <button
                key={catName}
                className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-sm"
                onClick={() => setSelectedCategories([categoriaObj])}
              >
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: legendColor }} />
                <span className="text-gray-700">{catName}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex w-full flex-col justify-center gap-4">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhuma transação encontrada para o período selecionado.
          </div>
        ) : categoriaSelecionada ? (
          <BarDetailChart
            height={isMobile ? 300 : 320}
            yAxisWidth={yWidth}
            color={findColorCategory(categoriaSelecionada) || '#94a3b8'}
            items={dataDetalhada}
          />
        ) : (
          <BarCompareChart
            containerW={containerW}
            height={isMobile ? 300 : 360}
            yAxisWidth={yWidth}
            income={incomeForChart}
            stackedLabel="Despesas"
            segments={segmentsForChart}
          />
        )}
      </div>
    </div>
  )
}
