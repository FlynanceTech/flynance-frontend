'use client'

import React, { useMemo, useRef, useEffect, useState, RefObject } from 'react'
import { ChevronDown, Undo2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

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
  periodTag?: string
  availableHeight?: number
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

export default function ComparisonChart({ transactions = [], isLoading = false, periodTag, availableHeight }: ComparisonChartProps) {
  const t = useTranslations('comparisonChart')
  const locale = useLocale()
  const isMobile = useIsMobile()
  const [showLegend, setShowLegend] = useState(false)
  const [containerW, containerRef] = useContainerWidth()
  const chartHeight = availableHeight && availableHeight > 200
    ? Math.max(280, Math.min(600, availableHeight - 96))
    : (isMobile ? 300 : 320)

  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)

  const { categoriesQuery } = useCategories()
  const allCategories: CategoryResponse[] = categoriesQuery.data ?? []

  const isDetalhado = selectedCategories.length === 1
  const categoriaSelecionada = isDetalhado ? selectedCategories[0] : null

  const baseTransactions: Transaction[] = transactions ?? []

  const receitas = useMemo(() => baseTransactions.filter((tx: Transaction) => tx.type === 'INCOME'), [baseTransactions])
  const despesas = useMemo(() => baseTransactions.filter((tx: Transaction) => tx.type === 'EXPENSE'), [baseTransactions])
  const totalReceita = useMemo(
    () => receitas.reduce((acc, item) => acc + item.value, 0),
    [receitas]
  )

  const despesasPorCategoria = useMemo(() => {
    return despesas.reduce((acc: Record<string, number>, tx: Transaction) => {
      const name = tx?.category?.name ?? t('uncategorized')
      acc[name] = (acc[name] || 0) + tx.value
      return acc
    }, {})
  }, [despesas, t])

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
      .filter((segment) => segment.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [despesasPorCategoria, allCategories])

  const incomeForChart = useMemo(() => {
    return { label: t('incomeLabel'), value: totalReceita, color: '#22C55E' }
  }, [totalReceita, t])

  const dataDetalhada = useMemo(() => {
    if (!categoriaSelecionada) return []
    return baseTransactions
      .filter((tx) => tx?.category?.id === categoriaSelecionada.id)
      .map((tx) => ({
        dateLabel: new Date(tx.date).toLocaleDateString(locale),
        value: tx.value,
        description: tx.description,
      }))
  }, [baseTransactions, categoriaSelecionada, locale])

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
    <div ref={containerRef} className="relative w-full h-full rounded-xl border border-gray-200 bg-white p-4 shadow">
      <div className="flex items-center justify-between lg:px-4 lg:pt-4">
        <div className="grid grid-cols-3 w-full items-start gap-2 lg:flex lg:flex-row lg:justify-between">
          <div className="flex w-full flex-col col-span-2">
            <h2 className="text-xl font-semibold text-gray-800">
              {categoriaSelecionada ? t('detailsOf', { category: categoriaSelecionada.name }) : t('title')}
            </h2>
            {!categoriaSelecionada && periodTag && (
              <span className="mt-1 w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {periodTag}
              </span>
            )}
          </div>

          {categoriaSelecionada ? (
            <button
              onClick={() => setSelectedCategories([])}
              className="flex cursor-pointer items-center gap-2 text-sm text-[#333C4D]"
            >
              {t('back')}
              <Undo2 className="h-5 w-5" />
            </button>
          ) : (
            <div className="mb-4 flex w-full items-center justify-between gap-4 md:justify-end">
              <button
                onClick={handleShowLegend}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-secondary/30 px-4 py-2 text-xs lg:text-sm text-[#333C4D]"
              >
                <strong>{t('legend')}</strong>
                <ChevronDown className={`lg:h-5 lg:w-5 h-4 w-4 transition-transform duration-200 ${showLegend ? 'rotate-180' : ''}`} />
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
            {t('noTransactions')}
          </div>
        ) : categoriaSelecionada ? (
          <BarDetailChart
            height={chartHeight}
            yAxisWidth={yWidth}
            color={findColorCategory(categoriaSelecionada) || '#94a3b8'}
            items={dataDetalhada}
            emptyMessage={t('detailsNoTransactions')}
            dateLabel={t('tooltipDateLabel')}
            valueLabel={t('tooltipValueLabel')}
          />
        ) : (
          <BarCompareChart
            containerW={containerW}
            height={chartHeight}
            yAxisWidth={yWidth}
            income={incomeForChart}
            stackedLabel={t('expensesStackedLabel')}
            segments={segmentsForChart}
          />
        )}
      </div>
    </div>
  )
}
