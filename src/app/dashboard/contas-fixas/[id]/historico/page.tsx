'use client'

import Header from '../../../components/Header'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useFixedAccountPayments, useFixedAccounts } from '@/hooks/query/useFixedAccounts'

function toBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDateBR(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR')
}

export default function FixedAccountHistoryPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const paymentsQuery = useFixedAccountPayments(id)
  const payments = paymentsQuery.data ?? []
  const fixedAccountsQuery = useFixedAccounts().fixedAccountsQuery
  const fixedAccount = (fixedAccountsQuery.data ?? []).find((item) => item.id === id)
  const categoryLabel = fixedAccount?.category?.name ?? 'Sem categoria'

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header title="HistÃ³rico de pagamentos" subtitle="Acompanhe os pagamentos desta conta fixa." newTransation={false} />

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
            Carregando histÃ³rico...
          </div>
        )}

        {paymentsQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Erro ao carregar histÃ³rico.
          </div>
        )}

        {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Nenhum pagamento registrado.
          </div>
        )}

        {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length > 0 && (
          <div className="flex flex-col gap-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-lg border border-gray-200 p-4 flex flex-col gap-2 bg-white"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Pago em:</span>
                  <span>{formatDateBR(payment.paidAt)}</span>
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
    </section>
  )
}
