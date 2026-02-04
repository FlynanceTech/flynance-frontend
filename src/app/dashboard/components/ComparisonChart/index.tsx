'use client'

import React, { useMemo, useRef, useEffect, useState, RefObject } from 'react'
import { ChevronDown, Undo2 } from 'lucide-react'

import { categoriaCores } from '@/utils/categoriesIcone'
import type { Transaction } from '@/types/Transaction'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTransactionFilter } from '@/stores/useFilter'
import { useCategories } from '@/hooks/query/useCategory'
import type { CategoryResponse } from '@/services/category'

import { BarCompareChart, BarDetailChart } from './barChart'

interface ComparisonChartProps {
  transactions?: Transaction[]
  isLoading?: boolean
}

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

export default function ComparisonChart({ transactions = [], isLoading = false }: ComparisonChartProps) {
  const isMobile = useIsMobile()
  const [showLegend, setShowLegend] = useState(false)
  const [containerW, containerRef] = useContainerWidth()

  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)

  const { categoriesQuery } = useCategories()
  const allCategories: CategoryResponse[] = categoriesQuery.data ?? []

  const isDetalhado = selectedCategories.length === 1
  const categoriaSelecionada = isDetalhado ? selectedCategories[0] : null

  const baseTransactions: Transaction[] = transactions ?? []

  const receitas = useMemo(() => baseTransactions.filter((t: Transaction) => t.type === 'INCOME'), [baseTransactions])

  const despesas = useMemo(() => baseTransactions.filter((t: Transaction) => t.type === 'EXPENSE'), [baseTransactions])

  const totalReceita = useMemo(
    () => receitas.reduce((acc, item) => acc + item.value, 0),
    [receitas]
  )

  const despesasPorCategoria = useMemo(() => {
    return despesas.reduce((acc: Record<string, number>, item: Transaction) => {
      const name = item?.category?.name ?? 'Sem categoria'
      acc[name] = (acc[name] || 0) + item.value
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
          categoriaCores[categoriaName] ??
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
    return { label: 'Renda', value: totalReceita, color: '#22C55E' }
  }, [totalReceita])

  const dataDetalhada = useMemo(() => {
    if (!categoriaSelecionada) return []
    return baseTransactions
      .filter((t) => t?.category?.id === categoriaSelecionada.id)
      .map((t) => ({
        dateLabel: new Date(t.date).toLocaleDateString('pt-BR'),
        value: t.value,
        description: t.description,
      }))
  }, [baseTransactions, categoriaSelecionada])

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
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${showLegend ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showLegend && !categoriaSelecionada && (
        <div className="absolute z-10 right-0 w-full gap-3 rounded-md bg-white p-2 shadow-md max-w-[380px] lg:max-w-full grid grid-cols-2 lg:grid-cols-3">
          {categoriasDespesas.map((catName) => {
            const categoriaObj = allCategories.find((c) => c.name.trim() === catName.trim())
            if (!categoriaObj) return null

            const legendColor = categoriaObj.color ?? categoriaCores[catName] ?? '#CBD5E1'

            return (
              <button
                key={catName}
                className="flex min-w-0 cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-sm hover:bg-gray-200 max-w-40 lg:max-w-full"
                onClick={() => setSelectedCategories([categoriaObj])}
              >
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: legendColor }} />
                <span className="truncate text-gray-700">{catName}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex w-full flex-col justify-center gap-4 p-4">
        {baseTransactions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhuma transação encontrada.
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
            height={isMobile ? 300 : 320}
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
