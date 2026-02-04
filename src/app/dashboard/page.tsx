'use client'

import React, { useEffect, useMemo, useState } from 'react'

import Header from './components/Header/overview'
import { SpendingControl } from './components/SpendingControl'
import ComparisonChart from './components/ComparisonChart'
import CategorySpendingDistribution from './components/CategorySpendingDistribution'
import InstallPrompt from '@/components/cadastro/InstallPrompt/InstallPrompt'

import FinanceStatus from './components/FincanceStatus'

import { useUserSession } from '@/stores/useUserSession'
import { useTransactionFilter } from '@/stores/useFilter'
import { useTranscation } from '@/hooks/query/useTransaction'

const PERIOD_ZERO = {
  income: 0,
  expense: 0,
  balance: 0,
  incomeChange: 0,
  expenseChange: 0,
  balanceChange: 0,
}

const ACC_ZERO = {
  totalIncome: 0,
  totalExpense: 0,
  totalBalance: 0,
}

function pad2(v: any) {
  return String(v).padStart(2, '0')
}

function monthLabel(month: string, year: string) {
  if (!month || !year) return ''
  return `${pad2(month)}/${year}`
}

// fallback local caso backend ainda não retorne meta.financeStatus
function computeFinanceStatusFromTransactions(transactions: any) {
  const income = (transactions || [])
    .filter((t: { type: string }) => t.type === 'INCOME')
    .reduce((acc: number, t: { value: any }) => acc + Number(t.value || 0), 0)

  const expense = (transactions || [])
    .filter((t: { type: string }) => t.type === 'EXPENSE')
    .reduce((acc: number, t: { value: any }) => acc + Number(t.value || 0), 0)

  const balance = income - expense

  return {
    period: {
      income,
      expense,
      balance,
      incomeChange: 0,
      expenseChange: 0,
      balanceChange: 0,
    },
    accumulated: {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: balance,
    },
  }
}

export default function Dashboard() {
  const { user } = useUserSession()
  const userId = user?.userData?.user?.id ?? ''

  const mode = useTransactionFilter((s) => s.appliedMode)
  const dateRange = useTransactionFilter((s) => s.appliedDateRange)
  const selectedMonth = useTransactionFilter((s) => s.appliedSelectedMonth)
  const selectedYear = useTransactionFilter((s) => s.appliedSelectedYear)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  // ✅ única chamada de transactions (já filtrada globalmente pelo hook)
  const { transactionsQuery } = useTranscation({ userId, page: 1, limit: 5000 })
  const isTxLoading = transactionsQuery.isLoading

  const transactions =
    (transactionsQuery.data?.transactions ?? transactionsQuery.data ?? []) || []

  const periodLabel = useMemo(() => {
    if (mode === 'month' && selectedMonth && selectedYear) {
      return `mês (${monthLabel(selectedMonth, selectedYear)})`
    }
    return `últimos ${Number(dateRange || 30)} dias`
  }, [mode, selectedMonth, selectedYear, dateRange])

  // ✅ prioridade: backend manda pronto (ideal)
  // Exemplo esperado: response.meta.financeStatus = { period, accumulated }
  const financeFromApi =
    transactionsQuery.data?.meta?.financeStatus ||
    transactionsQuery.data?.financeStatus ||
    null

  const financeStatus = useMemo(() => {
    if (financeFromApi?.period && financeFromApi?.accumulated) return financeFromApi
    return computeFinanceStatusFromTransactions(transactions)
  }, [financeFromApi, transactions])

  if (!hydrated) return null

  return (
    <section className="flex flex-col gap-4 w-full overflow-auto">
      <Header
        title="Dashboard Financeiro"
        subtitle="Veja um resumo da sua vida financeira."
        asFilter
        userId={userId}
      />

      <div className="flex flex-col gap-4 md:pt-0 px-4 lg:pl-0 pb-24 lg:pb-0">
        {/* ✅ Agora FinanceStatus vem da query de transactions */}
        <FinanceStatus
          period={financeStatus?.period ?? PERIOD_ZERO}
          accumulated={financeStatus?.accumulated ?? ACC_ZERO}
          isLoading={isTxLoading}
          periodLabel={periodLabel}
        />

        <section className="grid md:grid-cols-4 grid-cols-1 gap-4 lg:gap-4 w-full">
          <div className="md:col-span-4 flex gap-4 flex-col w-full">
            <div className="flex flex-col lg:grid lg:grid-cols-5 lg:gap-4">
              <div className="lg:col-span-3">
                <ComparisonChart
                  transactions={transactions}
                  isLoading={isTxLoading}
                />
              </div>

              <div className="lg:col-span-2 h-full">
                <SpendingControl />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 h-full">
              <CategorySpendingDistribution
                transactions={transactions}
                isLoading={isTxLoading}
              />
            </div>
          </div>
        </section>

        <InstallPrompt />
      </div>
    </section>
  )
}
