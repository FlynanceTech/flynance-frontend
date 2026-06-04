'use client'

import clsx from 'clsx'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Transaction } from '@/types/Transaction'
import { IconResolver } from '@/utils/IconResolver'
import DeleteConfirmModal from '../DeleteConfirmModal'
import { formatCurrency } from '@/utils/formatter'
import { resolveDisplayDescription } from '@/utils/displayDescription'
import { getCreditCardStatementPaymentDetails } from '@/utils/cashflowTransactions'

interface Props {
  transactions: Transaction[]
  getActorLabel: (transaction: Transaction) => string
  showActor?: boolean
  selectedIds: Set<string>
  onToggleSelectRow: (index: string) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (index: string) => void
  canWrite?: boolean
  canWriteTransaction?: (transaction: Transaction) => boolean
}

export function TransactionCardList({
  transactions,
  getActorLabel,
  showActor = true,
  selectedIds,
  onToggleSelectRow,
  onEdit,
  onDelete,
  canWrite = true,
  canWriteTransaction,
}: Props) {
  const t = useTranslations('transactionCard')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [expandedStatementIds, setExpandedStatementIds] = useState<Set<string>>(new Set())

  const paymentLabel = (value?: Transaction['paymentType']) => {
    if (!value) return t('payment.DEFAULT')
    const key = `payment.${value}`
    return t.has(key) ? t(key) : t('payment.DEFAULT')
  }

  const originLabel = (value?: Transaction['origin']) => {
    if (!value) return t('origin.DEFAULT')
    const key = `origin.${value}`
    return t.has(key) ? t(key) : t('origin.DEFAULT')
  }

  function handleConfirmDelete() {
    if (targetId) onDelete(targetId)
  }

  function toggleStatementDetails(id: string) {
    setExpandedStatementIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="lg:hidden flex flex-col gap-4">
      {transactions.map((item) => {
        const itemCanWrite = canWrite && (canWriteTransaction ? canWriteTransaction(item) : true)
        const category = item.category
        const categoryType = category?.type ?? item.type ?? 'EXPENSE'
        const isIncome = categoryType === 'INCOME'
        const iconName = category?.icon ?? 'circle'
        const description = resolveDisplayDescription(item.description, item.sourceDescription, t('noDescription'))
        const value = Number(item.value ?? 0)
        const categoryName = category?.name ?? t('noCategory')
        const actorLabel = getActorLabel(item)
        const statementDetails = getCreditCardStatementPaymentDetails(item)
        const hasStatementDetails = statementDetails.length > 0
        const statementExpanded = expandedStatementIds.has(item.id)

        return (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-start gap-3">
              {itemCanWrite && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelectRow(item.id)}
                  className="mt-1"
                />
              )}

              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      <IconResolver name={iconName} size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">{description}</h4>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-1 font-semibold text-white text-xs',
                      isIncome ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                    )}
                  >
                    {isIncome ? t('income') : t('expense')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(item.date))}
                  </span>

                  {item.card ? (
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-indigo-700">
                      {item.card.last4 ? `${item.card.name} ••${item.card.last4}` : item.card.name}
                      {(item.installmentCount ?? 1) > 1 && ` · ${item.installmentCount}x`}
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                      {paymentLabel(item.paymentType)}
                    </span>
                  )}

                  {!item.card && (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                      {originLabel(item.origin)}
                    </span>
                  )}
                  {showActor && (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                      {actorLabel}
                    </span>
                  )}
                </div>

                {hasStatementDetails && (
                  <button
                    type="button"
                    onClick={() => toggleStatementDetails(item.id)}
                    className="flex w-fit items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-primary"
                    aria-expanded={statementExpanded}
                  >
                    {t('statementPayment.viewDetails')}
                    <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', statementExpanded && 'rotate-180')} />
                  </button>
                )}

                {hasStatementDetails && statementExpanded && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{t('statementPayment.detailsTitle')}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {t('statementPayment.itemsCount', { count: statementDetails.length })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {statementDetails.map((detail) => (
                        <div key={detail.id} className="rounded-lg bg-white px-3 py-2 text-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">{detail.description}</p>
                              <p className="mt-0.5 text-slate-500">
                                {detail.categoryName} · {detail.installmentCount && detail.installmentCount > 1 ? `${detail.installmentNumber ?? 1}/${detail.installmentCount}` : '1/1'}
                              </p>
                              {detail.date && (
                                <p className="mt-0.5 text-slate-400">{new Date(detail.date).toLocaleDateString(locale)}</p>
                              )}
                            </div>
                            <span className="shrink-0 font-semibold text-slate-900">{formatCurrency(detail.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between gap-3">
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{categoryName}</p>
                  <span
                    className={clsx(
                      'shrink-0 text-sm font-semibold',
                      isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    )}
                  >
                    {isIncome ? formatCurrency(value) : `- ${formatCurrency(value)}`}
                  </span>

                  {itemCanWrite ? (
                    <div className="flex gap-2">
                      <button
                        className="text-gray-500 hover:text-blue-400 cursor-pointer"
                        onClick={() => onEdit(item)}
                        aria-label={t('editAria')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="text-gray-500 hover:text-red-400 cursor-pointer"
                        onClick={() => {
                          setTargetId(item.id)
                          setOpen(true)
                        }}
                        aria-label={t('deleteAria')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{t('readOnly')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <DeleteConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
      />
    </div>
  )
}
