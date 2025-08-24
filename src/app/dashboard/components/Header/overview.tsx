'use client'

import React, { useState, useMemo } from 'react'
import NotificationBell from '../NotificationBell'
import { NewTransactionButton } from '../Buttons'
import { CategoriesSelectWithCheck } from '../CategorySelect'
import SearchBar from '../SearchBar'
import TransactionDrawer from '../TransactionDrawer'
import { Category } from '@/types/Transaction'
import { Plus } from 'lucide-react'
import { useUserSession } from '@/stores/useUserSession'

import DateRangeSelect, { DateFilter } from '../DateRangeSelect'
import FinanceStatus, { FinanceStatusProps } from '../FincanceStatus'
import { useFinanceStatus } from '@/hooks/query/useFinanceStatus'

interface HeaderProps {
  title?: string
  subtitle: string
  asFilter?: boolean
  dataToFilter?: Category[]
  newTransation?: boolean
  userId: string
}

const PERIOD_ZERO: FinanceStatusProps['period'] = {
  income: 0,
  expense: 0,
  balance: 0,
  incomeChange: 0,
  expenseChange: 0,
  balanceChange: 0,
}

const ACC_ZERO: FinanceStatusProps['accumulated'] = {
  totalIncome: 0,
  totalExpense: 0,
  totalBalance: 0,
}

function formatMonthShort(year: number, month: number) {
  // month: 1-12
  const d = new Date(Date.UTC(year, month - 1, 1))
  const fmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
  // ex.: "ago. de 2025" -> padroniza para "ago/2025"
  const raw = fmt.format(d) // "ago. de 2025"
  const [m, , y] = raw.split(' ') // ["ago.", "de", "2025"]
  return `${m.replace('.', '')}/${y}`
}

function getPrevMonthLabel(monthStr: string) {
  // monthStr: "YYYY-MM"
  const [y, m] = monthStr.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, 1))
  const prev = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 1, 1))
  const label = formatMonthShort(prev.getUTCFullYear(), prev.getUTCMonth() + 1)
  return `mês anterior (${label})`
}

export default function Header({
  subtitle,
  asFilter = false,
  dataToFilter,
  newTransation = true,
  userId,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filter, setFilter] = useState<DateFilter>({ mode: 'days', days: 30 })

  const { user } = useUserSession()
  const firstName =
    user?.account?.user?.name?.split(' ')[0]?.toLowerCase()?.replace(/^\w/, (c) => c.toUpperCase()) ?? ''

  // Monta params de query a partir do filtro local
  const { monthParam, daysParam, monthStr } = useMemo(() => {
    if (filter.mode === 'month') {
      const ms = `${filter.year}-${filter.month}` // YYYY-MM
      return { monthParam: ms, daysParam: undefined as number | undefined, monthStr: ms }
    }
    return { monthParam: undefined as string | undefined, daysParam: filter.days, monthStr: undefined as string | undefined }
  }, [filter])

  const financeStatusQuery = useFinanceStatus({
    userId,
    month: monthParam,
    days: daysParam,
  })

  // Label amigável do período (fora do datepicker)
  const periodLabel = useMemo(() => {
    return monthStr ? getPrevMonthLabel(monthStr) : `últimos ${daysParam ?? 0} dias`
  }, [monthStr, daysParam])

  return (
    <header className="flex flex-col">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-[#333C4D]">Olá, {firstName}!</h3>
.
          <div className="hidden lg:flex gap-4 items-center">
            {asFilter && (
              <div className="flex gap-4 items-center">
                {dataToFilter && (
                  <div className="flex gap-4 items-center">
                    <SearchBar />
                    <CategoriesSelectWithCheck />
                  </div>
                )}

                <DateRangeSelect value={filter} onChange={setFilter} withDisplay/>
              </div>
            )}

            <NotificationBell asFilter={asFilter} />
            {newTransation && <NewTransactionButton onClick={() => setDrawerOpen(true)} />}
          </div>

          <div className="flex lg:hidden gap-4 items-center">
            <DateRangeSelect value={filter} onChange={setFilter}  />
            <NotificationBell asFilter={asFilter} />
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-20 right-4 bg-green-100 text-black rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg z-40 sm:hidden"
        >
          <Plus />
        </button>

        <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>

      <p className="text-sm font-light pb-4 pt-2 md:pt-0">{subtitle}</p>

      <FinanceStatus
        period={financeStatusQuery.data?.period ?? PERIOD_ZERO}
        accumulated={financeStatusQuery.data?.accumulated ?? ACC_ZERO}
        isLoading={financeStatusQuery.isLoading}
        periodLabel={periodLabel}
      />
    </header>
  )
}
