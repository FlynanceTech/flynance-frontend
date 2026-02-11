'use client'

'use client'

import Header from '../../../components/Header'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import DeleteConfirmModal from '../../../components/DeleteConfirmModal'
import { useDeleteFixedAccountPayment, useFixedAccountPayments, useFixedAccounts } from '@/hooks/query/useFixedAccounts'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

function toBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDateBR(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR')
}

function monthKey(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
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

function buildMonthlySeries(payments: { dueDate: string; paidAt: string; amount: number }[]) {
  const map = new Map<string, number>()
  payments.forEach((p) => {
    const key = monthKey(p.dueDate || p.paidAt)
    if (!key) return
    map.set(key, (map.get(key) ?? 0) + Number(p.amount ?? 0))
  })
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, total]) => ({ month: key, total }))
}

export default function FixedAccountHistoryPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const paymentsQuery = useFixedAccountPayments(id)
  const deletePaymentMutation = useDeleteFixedAccountPayment(id)
  const payments = paymentsQuery.data ?? []
  const chartData = buildMonthlySeries(payments)
  const fixedAccountsQuery = useFixedAccounts().fixedAccountsQuery
  const fixedAccount = (fixedAccountsQuery.data ?? []).find((item) => item.id === id)
  const categoryLabel = fixedAccount?.category?.name ?? 'Sem categoria'
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header title="Histórico de pagamentos" subtitle="Acompanhe os pagamentos desta conta fixa." newTransation={false} />

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

        {paymentsQuery.isLoading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Carregando Histórico...
          </div>
        )}

        {paymentsQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Erro ao carregar Histórico.
          </div>
        )}

        {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Nenhum pagamento registrado.
          </div>
        )}

        {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-gray-200 p-4 bg-white">
              <div className="mb-3 text-sm font-semibold text-gray-700">
                Histórico de gastos (por Competência)
              </div>
              {chartData.length === 0 ? (
                <div className="text-sm text-gray-500">Sem dados para gerar o grÃ¡fico.</div>
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
                      tickFormatter={(v) => `R$ ${Number(v).toFixed(0)}`}
                    />
                    <Tooltip
                      formatter={(v: number) =>
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(v))
                      }
                      labelFormatter={(label) => `Competência: ${formatMonthLabel(String(label))}`}
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
        description="Tem certeza que deseja excluir este pagamento do histórico?"
        confirmLabel="Excluir"
      />
    </section>
  )
}
