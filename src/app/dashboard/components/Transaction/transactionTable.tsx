'use client'

import React, { useMemo } from 'react'
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { Transaction } from '@/types/Transaction'
import { formatCurrency } from '@/utils/formatter'

type SortField = 'date' | 'value' | null
type SortDirection = 'asc' | 'desc'

type Props = {
  transactions: Transaction[]
  getActorLabel: (transaction: Transaction) => string
  selectedIds: Set<string>
  selectAll: boolean
  onToggleSelectAll: () => void
  onToggleSelectRow: (id: string) => void
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
  canWrite?: boolean
  canWriteTransaction?: (transaction: Transaction) => boolean
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: 'date' | 'value') => void
}

function toCurrency(v: number) {
  return formatCurrency(v || 0)
}

function fmtDate(d: unknown, locale: string) {
  const dt = d instanceof Date ? d : new Date(String(d))
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString(locale)
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="h-4 w-4 opacity-60" />
  return direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
}

const GRID_COLS = 'grid-cols-[40px_110px_minmax(220px,1fr)_170px_220px_110px_140px_92px]'

export function TransactionTable({
  transactions,
  getActorLabel,
  selectedIds,
  selectAll,
  onToggleSelectAll,
  onToggleSelectRow,
  onEdit,
  onDelete,
  canWrite = true,
  canWriteTransaction,
  sortField,
  sortDirection,
  onSortChange,
}: Props) {
  const t = useTranslations('transactionTable')
  const locale = useLocale()
  const hasData = transactions?.length > 0
  const rows = useMemo(() => transactions ?? [], [transactions])

  return (
    <div className="w-full hidden md:block">
      <div className="rounded-xl border border-gray-200 bg-white shadow overflow-hidden">
        <div
          role="row"
          className={[
            'sticky top-0 z-10',
            'grid',
            GRID_COLS,
            'items-center gap-0',
            'border-b border-gray-200 ',
            'bg-secondary/30 backdrop-blur',
            'px-4 py-4',
          ].join(' ')}
        >
          <div role="columnheader" className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={onToggleSelectAll}
              disabled={!canWrite}
              className="h-4 w-4 accent-black disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t('selectAllAria')}
            />
          </div>

          <button
            type="button"
            role="columnheader"
            onClick={() => onSortChange('date')}
            className="flex items-center gap-2 text-left text-sm font-semibold text-primary hover:text-foreground cursor-pointer"
            title={t('sortByDate')}
          >
            {t('date')}
            <SortIcon active={sortField === 'date'} direction={sortDirection} />
          </button>

          <div role="columnheader" className="text-sm font-semibold text-primary">
            {t('description')}
          </div>

          <div role="columnheader" className="text-sm font-semibold text-primary">
            {t('actor')}
          </div>

          <div role="columnheader" className="hidden lg:block text-sm font-semibold text-primary">
            {t('category')}
          </div>

          <div role="columnheader" className="hidden lg:block text-sm font-semibold text-primary">
            {t('type')}
          </div>

          <button
            type="button"
            role="columnheader"
            onClick={() => onSortChange('value')}
            className="flex items-center justify-end gap-2 text-right text-sm font-semibold text-primary hover:text-foreground pr-8 cursor-pointer"
            title={t('sortByValue')}
          >
            {t('value')}
            <SortIcon active={sortField === 'value'} direction={sortDirection} />
          </button>

          <div role="columnheader" className="text-right text-sm font-semibold text-primary pr-2">
            {t('actions')}
          </div>
        </div>

        <div role="rowgroup" className="max-h-[580px] overflow-auto">
          {!hasData ? (
            <div className="p-6 text-sm text-gray-500">{t('noData')}</div>
          ) : (
            rows.map((tx) => {
              const rowCanWrite = canWrite && (canWriteTransaction ? canWriteTransaction(tx) : true)
              const checked = selectedIds.has(tx.id)
              const categoryName = tx.category?.name ?? '-'
              const categoryColor = tx.category?.color ?? '#CBD5E1'
              const isExpense = tx.type === 'EXPENSE'
              const value = Number(tx.value ?? 0)
              const description = tx.description || t('noDescription')
              const actorLabel = getActorLabel(tx)

              return (
                <div
                  key={tx.id}
                  role="row"
                  className={[
                    'grid',
                    GRID_COLS,
                    'items-center',
                    'px-4 py-2',
                    'border-b border-gray-100',
                    'transition-colors hover:bg-muted/70',
                  ].join(' ')}
                >
                  <div role="cell" className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelectRow(tx.id)}
                      disabled={!rowCanWrite}
                      className="h-4 w-4 accent-black disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={t('selectRowAria', { description })}
                    />
                  </div>

                  <div role="cell" className="text-sm text-gray-700">
                    {fmtDate(tx.date, locale)}
                  </div>

                  <div role="cell" className="min-w-0 pr-4">
                    <div className="truncate text-sm font-medium text-gray-900">{description}</div>

                    <div className="lg:hidden mt-0.5 flex items-center gap-2 text-xs text-gray-500 ">
                      <span className="truncate max-w-[140px]">{actorLabel}</span>
                      <span className="opacity-60">.</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                        <span className="truncate max-w-[200px]">{categoryName}</span>
                      </span>
                      <span className="opacity-60">.</span>
                      <span>{isExpense ? t('expense') : t('income')}</span>
                    </div>
                  </div>

                  <div role="cell" className="min-w-0 pr-4 text-sm text-gray-700">
                    <span className="block truncate">{actorLabel}</span>
                  </div>

                  <div role="cell" className="hidden lg:flex items-center gap-2 text-sm text-gray-700 pr-4">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                    <span className="truncate">{categoryName}</span>
                  </div>

                  <div role="cell" className="hidden lg:block">
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                        isExpense ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
                      ].join(' ')}
                    >
                      {isExpense ? t('expense') : t('income')}
                    </span>
                  </div>

                  <div role="cell" className="text-right pr-8">
                    <span className={['text-sm font-semibold', isExpense ? 'text-red-400' : 'text-green-600'].join(' ')}>
                      {toCurrency(value)}
                    </span>
                  </div>

                  <div role="cell" className="flex items-center justify-end gap-2">
                    {rowCanWrite ? (
                      <>
                        <button
                          onClick={() => onEdit(tx)}
                          className="h-9 w-9 rounded-full border border-gray-200 hover:bg-muted/80 flex items-center justify-center cursor-pointer"
                          title={t('edit')}
                          aria-label={t('editAria')}
                        >
                          <Pencil className="h-4 w-4 text-gray-600" />
                        </button>

                        <button
                          onClick={() => onDelete(tx.id)}
                          className="h-9 w-9 rounded-full border border-gray-200 hover:bg-red-500/15 flex items-center justify-center cursor-pointer"
                          title={t('delete')}
                          aria-label={t('deleteAria')}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">{t('readOnly')}</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {t('sortTip', { data: t('date'), value: t('value') })}
      </div>
    </div>
  )
}
