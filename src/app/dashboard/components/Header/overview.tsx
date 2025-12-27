'use client'

import React, { useState, useMemo } from 'react'
/* import NotificationBell from '../NotificationBell' */
import { NewTransactionButton } from '../Buttons'
import { CategoriesSelectWithCheck } from '../CategorySelect'
import SearchBar from '../SearchBar'
import TransactionDrawer from '../TransactionDrawer'
import { Category } from '@/types/Transaction'
import { Plus } from 'lucide-react'
import { useUserSession } from '@/stores/useUserSession'

import DateRangeSelect from '../DateRangeSelect'
import type { DateFilter } from '../DateRangeSelect'

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

function formatRangeLabel(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${fmt(s)} – ${fmt(e)}`
}

function diffDaysInclusive(start: string, end: string) {
  const s = new Date(start + 'T00:00:00').getTime()
  const e = new Date(end + 'T00:00:00').getTime()
  const ms = 24 * 60 * 60 * 1000
  return Math.max(1, Math.floor((e - s) / ms) + 1)
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
    user?.userData.user.name?.split(' ')[0]?.toLowerCase()?.replace(/^\w/, (c) => c.toUpperCase()) ?? ''

  // ✅ Agora só existe days e range
  const { daysParam, rangeLabel } = useMemo(() => {
    if (filter.mode === 'range') {
      return {
        daysParam: diffDaysInclusive(filter.start, filter.end),
        rangeLabel: formatRangeLabel(filter.start, filter.end),
      }
    }

    return {
      daysParam: filter.days ?? 30,
      rangeLabel: undefined as string | undefined,
    }
  }, [filter])

  const financeStatusQuery = useFinanceStatus({
    userId,
    days: daysParam,
    // month removido (não existe mais no filtro)
  })

  const periodLabel = useMemo(() => {
    if (rangeLabel) return `período (${rangeLabel})`
    return `últimos ${daysParam ?? 0} dias`
  }, [rangeLabel, daysParam])

  return (
    <header className="flex flex-col">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-[#333C4D]">Olá, {firstName}!</h3>

          <div className="hidden lg:flex gap-4 items-center">
            {asFilter && (
              <div className="flex gap-4 items-center">
                {dataToFilter && (
                  <div className="flex gap-4 items-center">
                    <SearchBar />
                    <CategoriesSelectWithCheck />
                  </div>
                )}

                <DateRangeSelect value={filter} onChange={setFilter} withDisplay />
              </div>
            )}

            {/* <NotificationBell asFilter={asFilter} /> */}
            {newTransation && <NewTransactionButton onClick={() => setDrawerOpen(true)} />}
          </div>

          <div className="flex lg:hidden gap-4 items-center">
            <DateRangeSelect value={filter} onChange={setFilter} />
            {/* <NotificationBell asFilter={asFilter} /> */}
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-20 right-4 bg-secondary/30 text-black rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg z-40 sm:hidden"
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
