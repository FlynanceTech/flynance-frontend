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

function toBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
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

function formatDateBR(iso?: string | null) {
  const d = parseDateOnly(iso)
  if (!d) return ''
  return d.toLocaleDateString('pt-BR')
}

function monthKey(iso?: string | null) {
  const d = parseDateOnly(iso)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatMonthLabel(key: string) {
  const [y, m] = key.split('-')
  if (!y || !m) return key
  const dt = new Date(Number(y), Number(m) - 1, 1)
  return dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
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
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const fixedAccountQuery = useFixedAccount(id)
  const deletePaymentMutation = useDeleteFixedAccountPayment(id)
  const fixedAccount = fixedAccountQuery.data
  const payments = fixedAccount?.payments ?? []
  const chartData = buildMonthlySeries(payments)
  const categoryLabel = fixedAccount?.category?.name ?? 'Sem categoria'
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header
        title="Historico de pagamentos"
        subtitle="Acompanhe os pagamentos desta conta fixa."
        newTransation={false}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#333C4D]">{fixedAccount?.name ?? 'Conta fixa'}</h2>
            <p className="text-sm text-slate-500">Categoria: {categoryLabel}</p>
          </div>
          <Link
            href="/dashboard/contas-fixas"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </Link>
        </div>

        {fixedAccountQuery.isLoading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Carregando historico...
          </div>
        )}

        {fixedAccountQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Erro ao carregar historico.
          </div>
        )}

        {!fixedAccountQuery.isLoading && !fixedAccountQuery.isError && payments.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Nenhum pagamento registrado.
          </div>
        )}

        {!fixedAccountQuery.isLoading && !fixedAccountQuery.isError && payments.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-gray-200 p-4 bg-white">
              <div className="mb-3 text-sm font-semibold text-gray-700">
                Historico de gastos (por competencia)
              </div>
              {chartData.length === 0 ? (
                <div className="text-sm text-gray-500">Sem dados para gerar o grafico.</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthLabel}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$ ${Number(value).toFixed(0)}`}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(value))
                      }
                      labelFormatter={(label) => `Competencia: ${formatMonthLabel(String(label))}`}
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
                    <span className="font-semibold">Pago em:</span>
                    <span>{formatDateBR(payment.paidAt)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTargetId(payment.id)
                      setDeleteOpen(true)
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Excluir pagamento"
                    aria-label="Excluir pagamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Valor:</span>
                  <span>{toBRL(payment.amount)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Vencimento:</span>
                  <span>{formatDateBR(payment.dueDate)}</span>
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
        title="Excluir pagamento"
        description="Tem certeza que deseja excluir este pagamento do historico?"
        confirmLabel="Excluir"
      />
    </section>
  )
}
