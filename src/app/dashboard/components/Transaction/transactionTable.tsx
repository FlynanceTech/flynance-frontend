'use client'

import React, { useMemo } from 'react'
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { Transaction } from '@/types/Transaction'
import { formatCurrency } from '@/utils/formatter'
import { toFirstName } from '@/utils/actorName'
import { resolveDisplayDescription } from '@/utils/displayDescription'
import { getCreditCardStatementPaymentDetails } from '@/utils/cashflowTransactions'
import { useAdvisorActing } from '@/stores/useAdvisorActing'

const MASKED_DESCRIPTION = '*************'

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

function installmentLabel(number: number | null, count: number | null) {
  if (!number && !count) return '-'
  if (!count || count <= 1) return '1/1'
  return `${number ?? 1}/${count}`
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
  const actingAsClient = useAdvisorActing((s) => s.actingAsClient)
  const hasData = transactions?.length > 0
  const rows = useMemo(() => transactions ?? [], [transactions])
  const [expandedStatementIds, setExpandedStatementIds] = React.useState<Set<string>>(new Set())
  const gridCols = showActor
    ? 'grid-cols-[40px_110px_minmax(220px,1fr)_170px_220px_110px_140px_92px]'
    : 'grid-cols-[40px_110px_minmax(280px,1fr)_220px_110px_140px_92px]'

  const toggleStatementDetails = (id: string) => {
    setExpandedStatementIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
              const rawDescription = resolveDisplayDescription(tx.description, tx.sourceDescription, t('noDescription'))
              // Quando advisor está vendo cliente, mascara descrições de transações que ele não criou
              const description = actingAsClient && !rowCanWrite ? MASKED_DESCRIPTION : rawDescription
              const actorLabel = getActorLabel(tx)
              const actorFirstName = toFirstName(actorLabel) || actorLabel
              const statementDetails = getCreditCardStatementPaymentDetails(tx)
              const hasStatementDetails = statementDetails.length > 0
              const statementExpanded = expandedStatementIds.has(tx.id)

              return (
                <React.Fragment key={tx.id}>
                <div
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

                    {tx.card && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500">
                        <span className="truncate">
                          {tx.card.last4 ? `${tx.card.name} ••${tx.card.last4}` : tx.card.name}
                        </span>
                        {(tx.installmentCount ?? 1) > 1 && (
                          <span className="shrink-0 font-medium">{tx.installmentCount}x</span>
                        )}
                      </div>
                    )}

                    <div className="lg:hidden mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 ">
                      {showActor && (
                        <>
                          <span className="truncate max-w-[140px]">{actorFirstName}</span>
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
                      <span className="block truncate">{actorFirstName}</span>
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
                    {hasStatementDetails && (
                      <button
                        type="button"
                        onClick={() => toggleStatementDetails(tx.id)}
                        className="h-9 w-9 rounded-full border border-sky-100 bg-sky-50 text-primary hover:bg-sky-100 flex items-center justify-center cursor-pointer"
                        title={t('statementPayment.viewDetails')}
                        aria-label={t('statementPayment.viewDetails')}
                        aria-expanded={statementExpanded}
                      >
                        <ChevronDown className={['h-4 w-4 transition-transform', statementExpanded ? 'rotate-180' : ''].join(' ')} />
                      </button>
                    )}
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
                {hasStatementDetails && statementExpanded && (
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{t('statementPayment.detailsTitle')}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{t('statementPayment.detailsSubtitle')}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {t('statementPayment.itemsCount', { count: statementDetails.length })}
                        </span>
                      </div>
                      <div className="hidden grid-cols-[minmax(220px,1.5fr)_170px_90px_110px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase text-slate-500 lg:grid">
                        <span>{t('statementPayment.description')}</span>
                        <span>{t('statementPayment.category')}</span>
                        <span>{t('statementPayment.installment')}</span>
                        <span>{t('statementPayment.date')}</span>
                        <span className="text-right">{t('statementPayment.amount')}</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {statementDetails.map((detail) => (
                          <div
                            key={detail.id}
                            className="grid gap-2 px-4 py-3 text-sm lg:grid-cols-[minmax(220px,1.5fr)_170px_90px_110px_120px] lg:items-center lg:gap-4"
                          >
                            <p className="min-w-0 truncate font-medium text-slate-800">{detail.description}</p>
                            <p className="text-slate-600">{detail.categoryName}</p>
                            <p className="text-slate-600">{installmentLabel(detail.installmentNumber, detail.installmentCount)}</p>
                            <p className="text-slate-600">{detail.date ? fmtDate(detail.date, locale) : '-'}</p>
                            <p className="font-semibold text-slate-900 lg:text-right">{toCurrency(detail.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                </React.Fragment>
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
