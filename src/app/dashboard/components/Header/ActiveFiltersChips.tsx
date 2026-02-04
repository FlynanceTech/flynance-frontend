// app/dashboard/components/Header/ActiveFiltersChips.tsx
'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useTransactionFilter } from '@/stores/useFilter'
import clsx from 'clsx'

function Chip({
  children,
  onRemove,
  color,
}: {
  children: React.ReactNode
  onRemove?: () => void
  color?: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm">
      {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      <span className="max-w-[220px] truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Remover filtro"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default function ActiveFiltersChips({ fallbackText }: { fallbackText?: string }) {
  const selectedCategoriesDraft = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategoriesDraft = useTransactionFilter((s) => s.setSelectedCategories)

  const dateRangeDraft = useTransactionFilter((s) => s.dateRange)
  const setDateRangeDraft = useTransactionFilter((s) => s.setDateRange)

  const searchTermDraft = useTransactionFilter((s) => s.searchTerm)
  const setSearchTermDraft = useTransactionFilter((s) => s.setSearchTerm)

  const typeFilterDraft = useTransactionFilter((s) => s.typeFilter)
  const setTypeFilterDraft = useTransactionFilter((s) => s.setTypeFilter)

  const modeDraft = useTransactionFilter((s) => s.mode)
  const selectedMonthDraft = useTransactionFilter((s) => s.selectedMonth)
  const selectedYearDraft = useTransactionFilter((s) => s.selectedYear)

  const selectedCategoriesApplied = useTransactionFilter((s) => s.appliedSelectedCategories)
  const setSelectedCategoriesApplied = useTransactionFilter((s) => s.setAppliedSelectedCategories)

  const dateRangeApplied = useTransactionFilter((s) => s.appliedDateRange)
  const setDateRangeApplied = useTransactionFilter((s) => s.setAppliedDateRange)

  const searchTermApplied = useTransactionFilter((s) => s.appliedSearchTerm)
  const setSearchTermApplied = useTransactionFilter((s) => s.setAppliedSearchTerm)

  const typeFilterApplied = useTransactionFilter((s) => s.appliedTypeFilter)
  const setTypeFilterApplied = useTransactionFilter((s) => s.setAppliedTypeFilter)

  const modeApplied = useTransactionFilter((s) => s.appliedMode)
  const selectedMonthApplied = useTransactionFilter((s) => s.appliedSelectedMonth)
  const selectedYearApplied = useTransactionFilter((s) => s.appliedSelectedYear)

  const limparFiltros = useTransactionFilter((s) => s.limparFiltros)

  const sameCategoryIds = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false
    const ids = new Set(a.map((c) => c.id))
    return b.every((c) => ids.has(c.id))
  }

  const hasPending =
    !sameCategoryIds(selectedCategoriesDraft, selectedCategoriesApplied) ||
    (searchTermDraft || '') !== (searchTermApplied || '') ||
    Number(dateRangeDraft || 30) !== Number(dateRangeApplied || 30) ||
    typeFilterDraft !== typeFilterApplied ||
    modeDraft !== modeApplied ||
    (selectedMonthDraft || '') !== (selectedMonthApplied || '') ||
    (selectedYearDraft || '') !== (selectedYearApplied || '')

  const selectedCategories = hasPending ? selectedCategoriesDraft : selectedCategoriesApplied
  const dateRange = hasPending ? dateRangeDraft : dateRangeApplied
  const searchTerm = hasPending ? searchTermDraft : searchTermApplied
  const typeFilter = hasPending ? typeFilterDraft : typeFilterApplied

  const hasAny =
    selectedCategories.length > 0 ||
    !!searchTerm ||
    (dateRange && Number(dateRange) !== 30) ||
    typeFilter !== 'ALL'

  const typeLabel =
    typeFilter === 'INCOME' ? 'Receitas' : typeFilter === 'EXPENSE' ? 'Despesas' : ''

  const removeCategory = (id: string) => {
    const next = selectedCategories.filter((c) => c.id !== id)
    if (hasPending) setSelectedCategoriesDraft(next)
    else setSelectedCategoriesApplied(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hasAny ? (
        <p className="text-sm font-light text-slate-500">{fallbackText}</p>
      ) : (
        <>
          {hasPending && (
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Filtros pendentes
            </span>
          )}
          {dateRange && Number(dateRange) !== 30 && (
            <Chip onRemove={() => (hasPending ? setDateRangeDraft(30) : setDateRangeApplied(30))}>
              Ultimos {dateRange} dias
            </Chip>
          )}

          {typeFilter !== 'ALL' && (
            <Chip onRemove={() => (hasPending ? setTypeFilterDraft('ALL') : setTypeFilterApplied('ALL'))}>
              {typeLabel}
            </Chip>
          )}

          {!!searchTerm && (
            <Chip onRemove={() => (hasPending ? setSearchTermDraft('') : setSearchTermApplied(''))}>
              Busca: "{searchTerm}"
            </Chip>
          )}

          {selectedCategories.map((cat) => (
            <Chip
              key={cat.id}
              color={cat.color ?? '#CBD5E1'}
              onRemove={() => removeCategory(cat.id)}
            >
              {cat.name}
            </Chip>
          ))}

          <button
            type="button"
            onClick={limparFiltros}
            className={clsx(
              'ml-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50'
            )}
          >
            Limpar tudo
          </button>
        </>
      )}
    </div>
  )
}
