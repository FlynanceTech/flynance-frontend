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
  showActor?: boolean
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

export function TransactionTable({
  transactions,
  getActorLabel,
  showActor = true,
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
  const gridCols = showActor
    ? 'grid-cols-[40px_110px_minmax(220px,1fr)_170px_220px_110px_140px_92px]'
    : 'grid-cols-[40px_110px_minmax(280px,1fr)_220px_110px_140px_92px]'

  return (
    <div className="w-full hidden md:block">
      <div className="rounded-xl border border-gray-200 bg-white shadow overflow-hidden dark:border-white/10 dark:bg-[#121212]">
        <div
          role="row"
          className={[
            'sticky top-0 z-10',
            'grid',
            gridCols,
            'items-center gap-0',
            'border-b border-gray-200 ',
            'bg-secondary/30 backdrop-blur dark:border-white/10 dark:bg-[#1a1a1a]',
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
            className="flex items-center gap-2 text-left text-sm font-semibold text-primary hover:text-foreground cursor-pointer dark:text-white dark:hover:text-[#F4C542]"
            title={t('sortByDate')}
          >
            {t('date')}
            <SortIcon active={sortField === 'date'} direction={sortDirection} />
          </button>

          <div role="columnheader" className="text-sm font-semibold text-primary dark:text-white">
            {t('description')}
          </div>

          {showActor && (
            <div role="columnheader" className="text-sm font-semibold text-primary dark:text-white">
              {t('actor')}
            </div>
          )}

          <div role="columnheader" className="hidden lg:block text-sm font-semibold text-primary dark:text-white">
            {t('category')}
          </div>

          <div role="columnheader" className="hidden lg:block text-sm font-semibold text-primary dark:text-white">
            {t('type')}
          </div>

          <button
            type="button"
            role="columnheader"
            onClick={() => onSortChange('value')}
            className="flex items-center justify-end gap-2 text-right text-sm font-semibold text-primary hover:text-foreground pr-8 cursor-pointer dark:text-white dark:hover:text-[#F4C542]"
            title={t('sortByValue')}
          >
            {t('value')}
            <SortIcon active={sortField === 'value'} direction={sortDirection} />
          </button>

          <div role="columnheader" className="text-right text-sm font-semibold text-primary pr-2 dark:text-white">
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
                    gridCols,
                    'items-center',
                    'px-4 py-2',
                    'border-b border-gray-100 dark:border-white/5',
                    'transition-colors hover:bg-muted/70 dark:hover:bg-white/5',
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

                  <div role="cell" className="text-sm text-gray-700 dark:text-zinc-200">
                    {fmtDate(tx.date, locale)}
                  </div>

                  <div role="cell" className="min-w-0 pr-4">
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{description}</div>

                    <div className="lg:hidden mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 ">
                      {showActor && (
                        <>
                          <span className="truncate max-w-[140px]">{actorLabel}</span>
                          <span className="opacity-60">.</span>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                        <span className="truncate max-w-[200px]">{categoryName}</span>
                      </span>
                      <span className="opacity-60">.</span>
                      <span>{isExpense ? t('expense') : t('income')}</span>
                    </div>
                  </div>

                  {showActor && (
                    <div role="cell" className="min-w-0 pr-4 text-sm text-gray-700 dark:text-zinc-200">
                      <span className="block truncate">{actorLabel}</span>
                    </div>
                  )}

                  <div role="cell" className="hidden lg:flex items-center gap-2 text-sm text-gray-700 pr-4 dark:text-zinc-200">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                    <span className="truncate">{categoryName}</span>
                  </div>

                  <div role="cell" className="hidden lg:block">
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                        isExpense
                          ? 'bg-red-600 text-white dark:bg-red-500'
                          : 'bg-emerald-600 text-white dark:bg-emerald-500',
                      ].join(' ')}
                    >
                      {isExpense ? t('expense') : t('income')}
                    </span>
                  </div>

                  <div role="cell" className="text-right pr-8">
                    <span className={['text-sm font-semibold', isExpense ? 'text-red-500 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'].join(' ')}>
                      {toCurrency(value)}
                    </span>
                  </div>

                  <div role="cell" className="flex items-center justify-end gap-2">
                    {rowCanWrite ? (
                      <>
                        <button
                          onClick={() => onEdit(tx)}
                          className="h-9 w-9 rounded-full border border-gray-200 hover:bg-muted/80 flex items-center justify-center cursor-pointer dark:border-white/10 dark:hover:bg-white/5"
                          title={t('edit')}
                          aria-label={t('editAria')}
                        >
                          <Pencil className="h-4 w-4 text-gray-600 dark:text-white" />
                        </button>

                        <button
                          onClick={() => onDelete(tx.id)}
                          className="h-9 w-9 rounded-full border border-gray-200 hover:bg-red-500/15 flex items-center justify-center cursor-pointer dark:border-white/10"
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

      <div className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
        {t('sortTip', { data: t('date'), value: t('value') })}
      </div>
    </div>
  )
}
