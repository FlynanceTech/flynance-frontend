'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Bell, CheckCircle2, Wallet } from 'lucide-react'
import FinanceCard from '../FinanceCard'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'
import { useFixedAccounts } from '@/hooks/query/useFixedAccounts'

type ReminderStatus = {
  variant: 'ok' | 'due' | 'overdue'
  count: number
  nextInDays?: number
}

const REMINDER_DAYS = 3

function getMonthKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export interface FinanceStatusProps {
  period: {
    income: number
    expense: number
    balance: number        // não usamos no card de Saldo
    incomeChange: number
    expenseChange: number
    balanceChange: number  // não usamos na UI
  }
  accumulated: {
    totalIncome: number
    totalExpense: number
    totalBalance: number   // saldo exibido
  }
  isLoading: boolean
  /** rótulo do período selecionado (ex.: "últimos 3 dias", "últimos 30 dias", "mês passado") */
  periodLabel?: string
}

export default function FinanceStatus({
  period,
  accumulated,
  isLoading,
  periodLabel = 'período anterior',
}: FinanceStatusProps) {
  const { fixedAccountsQuery } = useFixedAccounts()

  const fmt = (v?: number) =>
    typeof v === 'number' && Number.isFinite(v)
      ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'R$ 0,00'

  const reminder = useMemo<ReminderStatus | null>(() => {
    const bills = fixedAccountsQuery.data ?? []
    if (!Array.isArray(bills) || bills.length === 0) return null

    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const msDay = 1000 * 60 * 60 * 24
    const monthKey = getMonthKey(startOfToday)

    let overdueCount = 0
    const upcoming = bills
      .filter((b) => b && b.name && b.dueDay && b.status !== 'canceled')
      .map((b) => {
        const paidThisMonth =
          typeof b.isPaid === 'boolean'
            ? b.isPaid
            : b.payment?.periodKey
            ? b.payment.periodKey === monthKey
            : !!b.payment

        if (paidThisMonth) return null

        const dueThisMonth = new Date(
          startOfToday.getFullYear(),
          startOfToday.getMonth(),
          b.dueDay
        )
        if (dueThisMonth.getTime() < startOfToday.getTime()) {
          overdueCount += 1
          return null
        }
        const dueDate =
          dueThisMonth.getTime() < startOfToday.getTime()
            ? new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, b.dueDay)
            : dueThisMonth
        const diffDays = Math.ceil((dueDate.getTime() - startOfToday.getTime()) / msDay)
        return { bill: b, diffDays }
      })
      .filter(
        (x): x is { bill: (typeof bills)[number]; diffDays: number } =>
          !!x && x.diffDays >= 0 && x.diffDays <= REMINDER_DAYS
      )
      .sort((a, b) => a.diffDays - b.diffDays)

    if (overdueCount > 0) {
      return { variant: 'overdue', count: overdueCount }
    }

    if (upcoming.length > 0) {
      return {
        variant: 'due',
        count: upcoming.length,
        nextInDays: upcoming[0].diffDays,
      }
    }

    return { variant: 'ok', count: 0 }
  }, [fixedAccountsQuery.data])

  if (isLoading) {
    return (
      <div className="grid grid-flow-col gap-8 w-full animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-2 w-full">
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-6 w-2/3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const income = period.income
  const expense = period.expense
  const balance = accumulated.totalBalance

  const incomeChange = Math.trunc(period.incomeChange || 0)
  const expenseChange = Math.trunc(period.expenseChange || 0)
  const hasBills = (fixedAccountsQuery.data?.length ?? 0) > 0
  const reminderLabel =
    reminder?.variant === 'due'
      ? reminder?.nextInDays === 0
        ? 'vence hoje'
        : `vence em ${reminder?.nextInDays ?? 0} dia${(reminder?.nextInDays ?? 0) === 1 ? '' : 's'}`
      : reminder?.variant === 'overdue'
      ? 'em atraso'
      : 'tudo em dia'
  const reminderTitle =
    reminder?.variant === 'overdue' ? (
      <h2 className="text-red-600 font-medium flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <AlertTriangle /> Contas em atraso
        </span>
        <span className="text-xs font-normal text-red-700">{reminderLabel}</span>
      </h2>
    ) : reminder?.variant === 'due' ? (
      <h2 className="text-amber-600 font-medium flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <Bell /> Contas a vencer
        </span>
        <span className="text-xs font-normal text-amber-700">{reminderLabel}</span>
      </h2>
    ) : (
      <h2 className="text-emerald-600 font-medium flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <CheckCircle2 /> Contas em dia
        </span>
        <span className="text-xs font-normal text-emerald-700">{reminderLabel}</span>
      </h2>
    )
  const reminderCard = reminder && (
    <Link
      href="/dashboard/contas-fixas"
      className="block rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/60"
      aria-label="Ver contas fixas"
    >
      <FinanceCard
        title={reminderTitle}
        value={
          reminder.variant === 'ok'
            ? 'Nenhuma pendência'
            : `${reminder.count} conta${reminder.count === 1 ? '' : 's'}`
        }
        periodLabel={reminderLabel}
        isLabel
      />
    </Link>
  )

  return (
    <div className="w-full">
      {/* Mobile */}
      <div className="lg:hidden">
        <TabGroup>
          <TabList className="flex gap-2 overflow-x-auto no-scrollbar">
            {['Saldo', 'Receita', 'Despesas', ...(hasBills && reminder ? ['Contas'] : [])].map((label) => (
              <Tab
                key={label}
                className={({ selected }) =>
                  `px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap outline-none ${
                    selected ? 'bg-secondary/30 text-primary' : 'bg-gray-100 text-gray-600'
                  }`
                }
              >
                {label}
              </Tab>
            ))}
          </TabList>

          <TabPanels className="mt-4">
            <TabPanel>
              <FinanceCard
                title={
                  <h2
                    className={`font-medium flex gap-2 ${
                      balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'
                    }`}
                  >
                    <Wallet /> Saldo
                  </h2>
                }
                value={fmt(balance)}
                isLabel
                isBalance
              />
            </TabPanel>

            <TabPanel>
              <FinanceCard
                percentage={incomeChange}
                periodLabel={periodLabel}
                title={
                  <h2 className="text-[#41B46B] font-medium flex gap-2">
                    <ArrowUp /> Receita
                  </h2>
                }
                value={fmt(income)}
                isLabel
              />
            </TabPanel>

            <TabPanel>
              <FinanceCard
                percentage={expenseChange}
                periodLabel={periodLabel}
                title={
                  <h2 className="text-[#F15959] font-medium flex gap-2">
                    <ArrowDown /> Despesas
                  </h2>
                }
                value={fmt(expense)}
                isExpense
                isLabel
              />
            </TabPanel>

            {hasBills && reminder && <TabPanel>{reminderCard}</TabPanel>}
          </TabPanels>
        </TabGroup>
      </div>

      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-flow-col gap-4 lg:gap-4">
        <FinanceCard
          title={
            <h2
              className={`font-medium flex gap-2 ${
                balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'
              }`}
            >
              <Wallet /> Saldo
            </h2>
          }
          value={fmt(balance)}
          periodLabel={periodLabel}
          isLabel
          isBalance   
        />
        <FinanceCard
          percentage={incomeChange}
          periodLabel={periodLabel}
          title={<h2 className="text-[#41B46B] font-medium flex gap-2"><ArrowUp /> Receita</h2>}
          value={fmt(income)}
          isLabel
        />
        <FinanceCard
          percentage={expenseChange}
          periodLabel={periodLabel}
          title={<h2 className="text-[#F15959] font-medium flex gap-2"><ArrowDown /> Despesas</h2>}
          value={fmt(expense)}
          isExpense
          isLabel
        />
        {hasBills && reminderCard}
      </div>
    </div>
  )
}
