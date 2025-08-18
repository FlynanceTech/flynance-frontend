'use client'

import React, { useEffect, useState } from 'react'
import FinanceStatus from './components/FincanceStatus'
import Header from './components/Header'
import { SpendingControl } from './components/SpendingControl'
import CategorySpendingDistribution from './components/CategorySpendingDistribution'
import CategoryChart from './components/CategoryChat'
import { useTransactionFilter } from '@/stores/useFilter'
import { useTranscation } from '@/hooks/query/useTransaction'
import { useUserSession } from '@/stores/useUserSession'
import { useFinanceStatus } from '@/hooks/query/useFinanceStatus'
import { Transaction } from '@/types/Transaction'

export default function Dashboard() {
  const { user } = useUserSession()
  const dateRange = useTransactionFilter((s) => s.dateRange)
  const month = useTransactionFilter((s)=> s.selectedMonth)
  const year = useTransactionFilter((s)=> s.selectedYear)
  const [hydrated, setHydrated] = useState(false)

  const { transactionsQuery } = useTranscation({
    userId: user?.account.userId
  })

  const transactions = transactionsQuery.data || []
  const transactionsLoading = transactionsQuery.isLoading

  const financeStatusQuery = useFinanceStatus({ days: dateRange, month: month ? `${year}-${month}` : '' })

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) return null

  const now = new Date()
  const filteredTransactions = transactions.filter((t: Transaction) => {
    const tDate = new Date(t.date)
    const diffInDays = (now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24)
    return diffInDays <= dateRange
  })

  return (
    <section className="flex flex-col gap-8 w-full  lg:pt-8 pt-4 lg:px-8 px-4 pb-24 lg:pb-0 overflow-auto">
      <Header
        title="Dashboard Financeiro"
        subtitle="Veja um resumo da sua vida financeira."
        asFilter
      />

      <div className='flex flex-col gap-4 lg:gap-8'>
        <FinanceStatus
          period={financeStatusQuery.data?.period ?? {
            income: 0,
            expense: 0,
            balance: 0,
            incomeChange: 0,
            expenseChange: 0,
            balanceChange: 0,
          }}
          accumulated={financeStatusQuery.data?.accumulated ?? {
            totalIncome: 0,
            totalExpense: 0,
            totalBalance: 0,
          }}
          isLoading={financeStatusQuery.isLoading}
        />


        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          <CategoryChart transactions={filteredTransactions} isLoading={transactionsLoading} />
          <SpendingControl transactions={filteredTransactions} isLoading={transactionsLoading} />
        </div>

        <CategorySpendingDistribution
          transactions={filteredTransactions}
          isLoading={transactionsLoading}
        />
      </div>
    </section>
  )
}
