'use client'

import React from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useTransactionFilter } from '@/stores/useFilter'
import { toRangeFromDays } from '@/utils/transactionPeriod'

function Chip({
  children,
  onRemove,
  color,
  removeAriaLabel,
}: {
  children: React.ReactNode
  onRemove?: () => void
  color?: string
  removeAriaLabel?: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm">
      {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      <span className="max-w-[260px] truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label={removeAriaLabel}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function formatDate(iso: string, locale: string): string {
  const parsed = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleDateString(locale)
}

function getPeriodLabel(params: {
  mode: 'days' | 'month' | 'range'
  dateRange: number
  includeFuture: boolean
  month: string
  year: string
  rangeStart: string
  rangeEnd: string
  locale: string
  t: (key: string, values?: Record<string, string | number | Date>) => string
}): string {
  if (params.mode === 'range' && params.rangeStart && params.rangeEnd) {
    return `${formatDate(params.rangeStart, params.locale)} - ${formatDate(params.rangeEnd, params.locale)}`
  }

  if (params.mode === 'month' && params.month && params.year) {
    return `${params.month}/${params.year}`
  }

  const safeDays = Math.max(1, Number(params.dateRange || 30))
  if (params.includeFuture) {
    return params.t('periodNextDays', { days: safeDays })
  }
  return params.t('periodLastDays', { days: safeDays })
}

export default function ActiveFiltersChips({ fallbackText }: { fallbackText?: string }) {
  const t = useTranslations('filters')
  const locale = useLocale()
  const selectedCategoriesDraft = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategoriesDraft = useTransactionFilter((s) => s.setSelectedCategories)

  const dateRangeDraft = useTransactionFilter((s) => s.dateRange)
  const setDateRangeDraft = useTransactionFilter((s) => s.setDateRange)
  const setModeDraft = useTransactionFilter((s) => s.setMode)
  const setIncludeFutureDraft = useTransactionFilter((s) => s.setIncludeFuture)
  const setSelectedMonthDraft = useTransactionFilter((s) => s.setSelectedMonth)
  const setSelectedYearDraft = useTransactionFilter((s) => s.setSelectedYear)
  const setRangeStartDraft = useTransactionFilter((s) => s.setRangeStart)
  const setRangeEndDraft = useTransactionFilter((s) => s.setRangeEnd)

  const searchTermDraft = useTransactionFilter((s) => s.searchTerm)
  const setSearchTermDraft = useTransactionFilter((s) => s.setSearchTerm)

  const typeFilterDraft = useTransactionFilter((s) => s.typeFilter)
  const setTypeFilterDraft = useTransactionFilter((s) => s.setTypeFilter)

  const modeDraft = useTransactionFilter((s) => s.mode)
  const includeFutureDraft = useTransactionFilter((s) => s.includeFuture)
  const selectedMonthDraft = useTransactionFilter((s) => s.selectedMonth)
  const selectedYearDraft = useTransactionFilter((s) => s.selectedYear)
  const rangeStartDraft = useTransactionFilter((s) => s.rangeStart)
  const rangeEndDraft = useTransactionFilter((s) => s.rangeEnd)

  const selectedCategoriesApplied = useTransactionFilter((s) => s.appliedSelectedCategories)
  const setSelectedCategoriesApplied = useTransactionFilter((s) => s.setAppliedSelectedCategories)

  const dateRangeApplied = useTransactionFilter((s) => s.appliedDateRange)
  const setDateRangeApplied = useTransactionFilter((s) => s.setAppliedDateRange)
  const setModeApplied = useTransactionFilter((s) => s.setAppliedMode)
  const setIncludeFutureApplied = useTransactionFilter((s) => s.setAppliedIncludeFuture)
  const setSelectedMonthApplied = useTransactionFilter((s) => s.setAppliedSelectedMonth)
  const setSelectedYearApplied = useTransactionFilter((s) => s.setAppliedSelectedYear)
  const setRangeStartApplied = useTransactionFilter((s) => s.setAppliedRangeStart)
  const setRangeEndApplied = useTransactionFilter((s) => s.setAppliedRangeEnd)

  const searchTermApplied = useTransactionFilter((s) => s.appliedSearchTerm)
  const setSearchTermApplied = useTransactionFilter((s) => s.setAppliedSearchTerm)

  const typeFilterApplied = useTransactionFilter((s) => s.appliedTypeFilter)
  const setTypeFilterApplied = useTransactionFilter((s) => s.setAppliedTypeFilter)

  const modeApplied = useTransactionFilter((s) => s.appliedMode)
  const includeFutureApplied = useTransactionFilter((s) => s.appliedIncludeFuture)
  const selectedMonthApplied = useTransactionFilter((s) => s.appliedSelectedMonth)
  const selectedYearApplied = useTransactionFilter((s) => s.appliedSelectedYear)
  const rangeStartApplied = useTransactionFilter((s) => s.appliedRangeStart)
  const rangeEndApplied = useTransactionFilter((s) => s.appliedRangeEnd)

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
    includeFutureDraft !== includeFutureApplied ||
    (selectedMonthDraft || '') !== (selectedMonthApplied || '') ||
    (selectedYearDraft || '') !== (selectedYearApplied || '') ||
    (rangeStartDraft || '') !== (rangeStartApplied || '') ||
    (rangeEndDraft || '') !== (rangeEndApplied || '')

  const selectedCategories = hasPending ? selectedCategoriesDraft : selectedCategoriesApplied
  const dateRange = hasPending ? dateRangeDraft : dateRangeApplied
  const searchTerm = hasPending ? searchTermDraft : searchTermApplied
  const typeFilter = hasPending ? typeFilterDraft : typeFilterApplied
  const mode = hasPending ? modeDraft : modeApplied
  const includeFuture = hasPending ? includeFutureDraft : includeFutureApplied
  const month = hasPending ? selectedMonthDraft : selectedMonthApplied
  const year = hasPending ? selectedYearDraft : selectedYearApplied
  const rangeStart = hasPending ? rangeStartDraft : rangeStartApplied
  const rangeEnd = hasPending ? rangeEndDraft : rangeEndApplied

  const hasAny =
    selectedCategories.length > 0 ||
    !!searchTerm ||
    (dateRange && Number(dateRange) !== 30) ||
    includeFuture ||
    mode === 'range' ||
    mode === 'month' ||
    typeFilter !== 'ALL'

  const typeLabel =
    typeFilter === 'INCOME' ? t('typeIncome') : typeFilter === 'EXPENSE' ? t('typeExpense') : ''

  const removeCategory = (id: string) => {
    const next = selectedCategories.filter((c) => c.id !== id)
    if (hasPending) setSelectedCategoriesDraft(next)
    else setSelectedCategoriesApplied(next)
  }

  const removePeriod = () => {
    const defaultRange = toRangeFromDays(30)

    if (hasPending) {
      setModeDraft('days')
      setDateRangeDraft(30)
      setIncludeFutureDraft(false)
      setSelectedMonthDraft('')
      setSelectedYearDraft('')
      setRangeStartDraft(defaultRange.start)
      setRangeEndDraft(defaultRange.end)
      return
    }

    setModeApplied('days')
    setDateRangeApplied(30)
    setIncludeFutureApplied(false)
    setSelectedMonthApplied('')
    setSelectedYearApplied('')
    setRangeStartApplied(defaultRange.start)
    setRangeEndApplied(defaultRange.end)
  }

  const periodLabel = getPeriodLabel({
    mode,
    dateRange: Number(dateRange || 30),
    includeFuture,
    month,
    year,
    rangeStart,
    rangeEnd,
    locale,
    t,
  })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hasAny ? (
        <p className="text-sm font-light text-slate-500">{fallbackText}</p>
      ) : (
        <>
          {hasPending && (
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {t('pending')}
            </span>
          )}
          {periodLabel && <Chip onRemove={removePeriod} removeAriaLabel={t('removeFilter')}>{periodLabel}</Chip>}
          {typeFilter !== 'ALL' && (
            <Chip
              onRemove={() => (hasPending ? setTypeFilterDraft('ALL') : setTypeFilterApplied('ALL'))}
              removeAriaLabel={t('removeFilter')}
            >
              {typeLabel}
            </Chip>
          )}

          {!!searchTerm && (
            <Chip
              onRemove={() => (hasPending ? setSearchTermDraft('') : setSearchTermApplied(''))}
              removeAriaLabel={t('removeFilter')}
            >
              {t('searchChip', { value: searchTerm })}
            </Chip>
          )}

          {selectedCategories.map((cat) => (
            <Chip
              key={cat.id}
              color={cat.color ?? '#CBD5E1'}
              onRemove={() => removeCategory(cat.id)}
              removeAriaLabel={t('removeFilter')}
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
            {t('clearAll')}
          </button>
        </>
      )}
    </div>
  )
}
