'use client'

import Header from '../../../components/Header'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import DeleteConfirmModal from '../../../components/DeleteConfirmModal'
import { useDeleteFixedAccountPayment, useFixedAccount } from '@/hooks/query/useFixedAccounts'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { FixedAccountPayment } from '@/services/fixedAccounts'
import { formatCurrency } from '@/utils/formatter'
import { useLocale, useTranslations } from 'next-intl'
import { useUserSession } from '@/stores/useUserSession'

function toBRL(value: number) {
  return formatCurrency(value || 0)
}

function parseDateOnly(value?: string | null) {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function formatDateForLocale(iso?: string | null, locale: string = 'pt-BR') {
  const d = parseDateOnly(iso)
  if (!d) return ''
  return d.toLocaleDateString(locale)
}

function monthKey(iso?: string | null) {
  const d = parseDateOnly(iso)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatMonthLabel(key: string, locale: string = 'pt-BR') {
  const [y, m] = key.split('-')
  if (!y || !m) return key
  const dt = new Date(Number(y), Number(m) - 1, 1)
  return dt.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
}

function formatAxisCurrency(value: number, locale: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''

  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }

  return formatCurrency(amount)
}

function buildMonthlySeries(payments: FixedAccountPayment[]) {
  const monthlyTotalByKey = new Map<string, number>()
  payments.forEach((payment) => {
    const key = monthKey(payment.dueDate ?? payment.paidAt)
    if (!key) return
    monthlyTotalByKey.set(key, (monthlyTotalByKey.get(key) ?? 0) + Number(payment.amount ?? 0))
  })

  return Array.from(monthlyTotalByKey.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }))
}

export default function FixedAccountHistoryPage() {
  const t = useTranslations('fixedAccountHistoryPage')
  const locale = useLocale()
  const currentUserId = useUserSession((state) => state.user?.userData?.user?.id ?? '')
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const fixedAccountQuery = useFixedAccount(id)
  const deletePaymentMutation = useDeleteFixedAccountPayment(id)
  const fixedAccount = fixedAccountQuery.data
  const payments = fixedAccount?.payments ?? []
  const canWriteFixedAccount = !fixedAccount?.userId || fixedAccount.userId === currentUserId
  const chartData = buildMonthlySeries(payments)
  const categoryLabel = fixedAccount?.category?.name ?? t('uncategorized')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
        newTransation={false}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#333C4D]">{fixedAccount?.name ?? t('fixedAccount')}</h2>
            <p className="text-sm text-slate-500">{t('categoryLabel', { category: categoryLabel })}</p>
          </div>
          <Link
            href="/dashboard/contas-fixas"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {t('back')}
          </Link>
        </div>

        {fixedAccountQuery.isLoading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {t('loading')}
          </div>
        )}

        {fixedAccountQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('loadError')}
          </div>
        )}

        {!fixedAccountQuery.isLoading && !fixedAccountQuery.isError && payments.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {t('empty')}
          </div>
        )}

        {!fixedAccountQuery.isLoading && !fixedAccountQuery.isError && payments.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-gray-200 p-4 bg-white">
              <div className="mb-3 text-sm font-semibold text-gray-700">
                {t('chart.title')}
              </div>
              {chartData.length === 0 ? (
                <div className="text-sm text-gray-500">{t('chart.noData')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => formatMonthLabel(String(value), locale)}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                      tickMargin={10}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={76}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      tickMargin={8}
                      tickFormatter={(value) => formatAxisCurrency(Number(value), locale)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(Number(value))}
                      labelFormatter={(label) =>
                        t('chart.competenceLabel', { month: formatMonthLabel(String(label), locale) })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-lg border border-gray-200 p-4 flex flex-col gap-2 bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span className="font-semibold">{t('paidAt')}</span>
                    <span>{formatDateForLocale(payment.paidAt, locale)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canWriteFixedAccount) return
                      setDeleteTargetId(payment.id)
                      setDeleteOpen(true)
                    }}
                    disabled={!canWriteFixedAccount}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-red-400 hover:bg-red-50 cursor-pointer"
                    title={t('deletePayment')}
                    aria-label={t('deletePayment')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="font-semibold">{t('value')}</span>
                  <span>{toBRL(payment.amount)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="font-semibold">{t('dueDate')}</span>
                  <span>{formatDateForLocale(payment.dueDate, locale)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteTargetId(null)
        }}
        onConfirm={() => {
          if (deleteTargetId) {
            deletePaymentMutation.mutate(deleteTargetId)
          }
        }}
        title={t('deletePayment')}
        description={t('deletePaymentDescription')}
        confirmLabel={t('delete')}
      />
    </section>
  )
}
