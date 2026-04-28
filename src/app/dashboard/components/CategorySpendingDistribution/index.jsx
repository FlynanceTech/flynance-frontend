'use client'

import React, { useMemo, useState } from 'react'
import {
  Treemap,
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
} from 'recharts'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowUpDown,
  ChartPie,
  ChartScatter,
} from 'lucide-react'

import { useCategories } from '@/hooks/query/useCategory'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { formatCurrency } from '@/utils/formatter'

function toCurrency(v) {
  return formatCurrency(Number(v || 0))
}

function truncateLabel(value, maxChars) {
  if (!value) return ''
  if (value.length <= maxChars) return value
  return `${value.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

const CustomRect = (props) => {
  const { depth, x, y, width, height, id, name, color, size, showLabel, onSelect } = props

  const fillColor = depth === 2 ? color : 'transparent'
  const canShowLabel =
    depth === 2 && showLabel && width >= 84 && height >= 40
  const labelMaxChars = Math.max(8, Math.floor(width / 7))
  const titleLabel =
    depth === 2 ? `${name} - ${toCurrency(size)}` : ''
  const handleSelect = () => {
    if (depth !== 2 || !id || typeof onSelect !== 'function') return
    onSelect(id, name)
  }

  return (
    <g onClick={handleSelect} style={depth === 2 ? { cursor: 'pointer' } : undefined}>
      {titleLabel ? <title>{titleLabel}</title> : null}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor,
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {canShowLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={width >= 140 ? 13 : 11}
          fontWeight={500}
          style={{ textRendering: 'geometricPrecision' }}
          pointerEvents="none"
        >
          {truncateLabel(name, labelMaxChars)}
        </text>
      )}
    </g>
  )
}

export default function CategorySpendingDistribution({ transactions, isLoading, periodTag }) {
  const t = useTranslations('categoryDistribution')
  const locale = useLocale()
  const [sortDesc, setSortDesc] = useState(true)
  const [changeChart, setChangeChart] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [freezeAnimation, setFreezeAnimation] = useState(false)

  useCategories()
  const categoryStore = useCategoryStore((s) => s.categoryStore)
  const categoryMap = useMemo(
    () => new Map(categoryStore.map((cat) => [cat.id, cat])),
    [categoryStore]
  )

  const despesas = transactions.filter((tx) => tx.type === 'EXPENSE')

  const map = despesas.reduce((acc, tx) => {
    const categoriaId = tx.category?.id || 'outros'
    const categoryFromStore = categoryMap.get(categoriaId)
    const rawName = tx.category?.name
    const categoriaNome =
      (rawName && rawName !== categoriaId ? rawName : undefined) ||
      categoryFromStore?.name ||
      (categoriaId === 'outros' ? t('otherCategory') : t('uncategorized'))
    const color = tx.category?.color || categoryFromStore?.color || '#CBD5E1'
    if (!acc[categoriaId]) {
      acc[categoriaId] = { id: categoriaId, name: categoriaNome, value: 0, color }
    }
    acc[categoriaId].value += tx.value
    return acc
  }, {})

  const categoriasAgrupadas = despesas.reduce((acc, tx) => {
    const id = tx.category?.id || 'outros'
    const categoryFromStore = categoryMap.get(id)
    const rawName = tx.category?.name
    const nome =
      (rawName && rawName !== id ? rawName : undefined) ||
      categoryFromStore?.name ||
      (id === 'outros' ? t('otherCategory') : t('uncategorized'))
    const cor = tx.category?.color || categoryFromStore?.color || '#CBD5E1'

    if (!acc[id]) {
      acc[id] = { id, name: nome, size: 0, color: cor }
    }

    acc[id].size += tx.value
    return acc
  }, {})

  const sortedTreemapChildren = Object.values(categoriasAgrupadas)
    .sort((a, b) => b.size - a.size)
    .map((entry, index) => ({
      ...entry,
      showLabel: index < 10,
    }))

  const data = [
    {
      name: '',
      children: sortedTreemapChildren,
    },
  ]

  const dataPie = Object.values(map).map(({ id, name, value, color }) => ({
    id,
    name,
    value,
    color,
  }))

  const total = data[0]?.children?.reduce((sum, item) => sum + item.size, 0) ?? 0
  const hasCategories = dataPie.length > 0
  const selectedTransactions = selectedCategoryId
    ? despesas.filter((tx) =>
        selectedCategoryId === 'outros'
          ? !tx.category?.id
          : tx.category?.id === selectedCategoryId
      )
    : []
  const disableAnimation = freezeAnimation

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full animate-pulse space-y-6">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="w-full h-[350px] bg-gray-100 rounded" />
      </div>
    )
  }

  const handleSelectCategory = (categoryId, categoryName) => {
    setSelectedCategoryId(categoryId)
    setSelectedCategoryName(categoryName)
    setFreezeAnimation(true)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col lg:flex-row gap-4 items-center lg:items-start">
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">{t('title')}</h2>
            {periodTag && (
              <span className="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {periodTag}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 justify-between">
            <button
              className="border border-gray-300 rounded-full p-1 text-gray-500 w-9 h-9 flex items-center justify-center hover:bg-gray-50 cursor-pointer"
              onClick={() => setChangeChart((prev) => !prev)}
              title={t('toggleChartTitle')}
            >
              {changeChart ? <ChartPie size={18} /> : <ChartScatter size={18} />}
            </button>
            <button
              onClick={() => setSortDesc((prev) => !prev)}
              className="border border-gray-300 rounded-full p-1 text-gray-500 w-9 h-9 flex items-center justify-center hover:bg-gray-50 cursor-pointer"
              title={t('toggleSortTitle')}
            >
              {sortDesc ? <ArrowUpDown size={18} /> : <ArrowDownUp size={18} />}
            </button>
          </div>
        </div>

        {hasCategories ? (
          <ResponsiveContainer width="100%" height={350}>
            {changeChart ? (
              <Treemap
                width={400}
                height={200}
                data={data}
                dataKey="size"
                nameKey="name"
                stroke="#fff"
                animationDuration={disableAnimation ? 0 : 500}
                content={(props) => (
                  <CustomRect
                    {...props}
                    onSelect={handleSelectCategory}
                  />
                )}
              />
            ) : (
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  isAnimationActive={!disableAnimation}
                >
                  {dataPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => [
                    toCurrency(value),
                    props?.payload?.name ?? '',
                  ]}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            {t('noExpensesInPeriod')}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 w-full lg:w-1/2 ">
        <div className="w-full space-y-4 overflow-auto pr-4 max-h-[420px]">
          {selectedCategoryId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {selectedCategoryName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {t('transactionsCount', { count: selectedTransactions.length })}
                  </p>
                </div>
                <button
                  className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedCategoryId(null)
                    setSelectedCategoryName('')
                    setFreezeAnimation(true)
                  }}
                  title={t('backToCategories')}
                >
                  <ArrowLeft size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {selectedTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-gray-800 font-medium">
                        {tx.description || t('defaultTransaction')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.date).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <span className="text-gray-900 font-semibold">
                      {toCurrency(tx.value)}
                    </span>
                  </div>
                ))}
                {selectedTransactions.length === 0 && (
                  <div className="text-sm text-gray-500">
                    {t('noTransactionsInCategory')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {[...(data[0]?.children ?? [])]
                .sort((a, b) => (sortDesc ? b.size - a.size : a.size - b.size))
                .map((entry, i) => {
                const percent = total > 0 ? (entry.size / total) * 100 : 0
                return (
                  <button
                    key={i}
                    className="w-full text-left space-y-1 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                    onClick={() => {
                      handleSelectCategory(entry.id, entry.name)
                    }}
                  >
                    <div className="flex justify-between text-sm text-gray-700 font-medium">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}
                      </span>
                      <span className="text-gray-900">{toCurrency(entry.size)}</span>
                    </div>
                    <div className="text-xs text-gray-500">{t('percentOfTotal', { percent: percent.toFixed(0) })}</div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${percent.toFixed(0)}%`, backgroundColor: entry.color }}
                      />
                    </div>
                  </button>
                )
              })}
              {!hasCategories && (
                <div className="text-sm text-gray-500">{t('noExpensesInPeriod')}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
