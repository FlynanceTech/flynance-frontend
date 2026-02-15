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
import { getBrowserTimezone, toFutureRangeFromDays } from '@/utils/transactionPeriod'

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
  const shortMonths = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.']
  const monthIndex = Number(month) - 1
  if (monthIndex < 0 || monthIndex > 11) return `${pad2(month)}/${year}`
  return `${shortMonths[monthIndex]} ${year}`
}

function computeFinanceStatusFromTransactions(transactions: any[]) {
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
  const includeFuture = useTransactionFilter((s) => s.appliedIncludeFuture)
  const rangeStart = useTransactionFilter((s) => s.appliedRangeStart)
  const rangeEnd = useTransactionFilter((s) => s.appliedRangeEnd)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const safeDays = Math.max(1, Number(dateRange || 30))
  const periodFilters = useMemo(() => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return {
        mode: 'range' as const,
        dateFrom: rangeStart,
        dateTo: rangeEnd,
        timezone: getBrowserTimezone(),
      }
    }

    if (mode === 'month' && selectedMonth && selectedYear) {
      return {
        mode: 'month' as const,
        month: selectedMonth,
        year: selectedYear,
        timezone: getBrowserTimezone(),
      }
    }

    const futureRange = includeFuture ? toFutureRangeFromDays(safeDays) : null
    return {
      mode: 'days' as const,
      days: safeDays,
      includeFutureDays: includeFuture ? Math.max(0, safeDays - 1) : undefined,
      dateFrom: futureRange?.start,
      dateTo: futureRange?.end,
      timezone: getBrowserTimezone(),
    }
  }, [mode, rangeStart, rangeEnd, selectedMonth, selectedYear, includeFuture, safeDays])

  // Fetch using the same period semantics used in /dashboard/transacoes
  const { transactionsQuery } = useTranscation({
    userId,
    page: 1,
    limit: 5000,
    filters: periodFilters,
    useGlobalFilters: false,
  })
  const isTxLoading = transactionsQuery.isLoading

  const transactions = useMemo(() => {
    const payload = transactionsQuery.data as any
    const list = payload?.transactions ?? payload ?? []
    return Array.isArray(list) ? list : []
  }, [transactionsQuery.data])

  const periodLabel = useMemo(() => {
    const suffix = includeFuture ? ' (incluindo futuros)' : ''
    if (mode === 'range' && rangeStart && rangeEnd) {
      const start = new Date(`${rangeStart}T00:00:00`)
      const end = new Date(`${rangeEnd}T00:00:00`)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
      }
    }
    if (mode === 'month' && selectedMonth && selectedYear) {
      return `${monthLabel(selectedMonth, selectedYear)}${suffix}`
    }
    if (includeFuture) {
      return `proximos ${Number(dateRange || 30)} dias`
    }
    return `ultimos ${Number(dateRange || 30)} dias${suffix}`
  }, [mode, selectedMonth, selectedYear, dateRange, includeFuture, rangeStart, rangeEnd])

  const financeStatus = useMemo(() => {
    return computeFinanceStatusFromTransactions(transactions)
  }, [transactions])

  if (!hydrated) return null

  return (
    <section className="flex flex-col gap-4 w-full overflow-auto">
      <Header
        title="Dashboard Financeiro"
        subtitle="Veja um resumo da sua vida financeira."
        asFilter
        showFutureFilter
        userId={userId}
      />

      <div className="flex flex-col gap-4 md:pt-0 px-4 lg:pl-0 pb-24 lg:pb-0">
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
                <ComparisonChart transactions={transactions} isLoading={isTxLoading} periodTag={periodLabel} />
              </div>

              <div className="lg:col-span-2 h-full">
                <SpendingControl />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 h-full">
              <CategorySpendingDistribution transactions={transactions} isLoading={isTxLoading} periodTag={periodLabel} />
            </div>
          </div>
        </section>

        <InstallPrompt />
      </div>
    </section>
  )
}
