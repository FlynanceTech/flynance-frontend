'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Bell, CheckCircle2, Eye, EyeOff, Wallet } from 'lucide-react'
import FinanceCard from '../FinanceCard'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'
import { useFixedAccounts } from '@/hooks/query/useFixedAccounts'

type ReminderStatus = {
  variant: 'ok' | 'due' | 'overdue'
  count: number
  nextInDays?: number
}

const REMINDER_DAYS = 3
const PREVIOUS_MONTH_COMPETENCE_MAX_DUE_DAY = 3

function getMonthKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}


function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function getSafeDueDate(year: number, month: number, dueDay: number) {
  const safeDay = Math.max(1, Math.trunc(dueDay || 1))
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(safeDay, lastDayOfMonth))
}

function getCompetenceOffsetMonths(dueDay: number) {
  const safeDay = Math.max(1, Math.trunc(dueDay || 1))
  return safeDay <= PREVIOUS_MONTH_COMPETENCE_MAX_DUE_DAY ? 1 : 0
}

function getCycleDueDate(cycleYear: number, cycleMonth: number, dueDay: number) {
  const dueMonthOffset = getCompetenceOffsetMonths(dueDay)
  return getSafeDueDate(cycleYear, cycleMonth + dueMonthOffset, dueDay)
}

function getPaymentCycleKey(value: string | null | undefined, dueDay: number) {
  const date = parseDateOnly(value)
  if (!date) return ''

  const anchor = new Date(date.getFullYear(), date.getMonth(), 1)
  const safeDay = Math.max(1, Math.trunc(dueDay || 1))
  if (safeDay <= PREVIOUS_MONTH_COMPETENCE_MAX_DUE_DAY && date.getDate() <= safeDay) {
    anchor.setMonth(anchor.getMonth() - 1)
  }

  return getMonthKey(anchor)
}

function resolvePaymentCycleKey(bill: {
  dueDay: number
  payment?: { periodKey?: string; dueDate?: string | null; paidAt?: string | null } | null
}) {
  const fromDueDate = getPaymentCycleKey(bill.payment?.dueDate ?? null, bill.dueDay)
  if (fromDueDate) return fromDueDate

  const periodKey = String(bill.payment?.periodKey ?? '').trim()
  if (periodKey) return periodKey

  return getPaymentCycleKey(bill.payment?.paidAt ?? null, bill.dueDay)
}

function getCycleInfo(dueDay: number, leadDays = 10, now = new Date()) {
  const currentCycleDueDate = getCycleDueDate(now.getFullYear(), now.getMonth(), dueDay)
  const boundary = new Date(currentCycleDueDate)
  boundary.setDate(boundary.getDate() - leadDays)

  let cycleYear = now.getFullYear()
  let cycleMonth = now.getMonth()
  if (now < boundary) {
    const prev = new Date(currentCycleDueDate)
    prev.setMonth(prev.getMonth() - 1)
    cycleYear = prev.getFullYear()
    cycleMonth = prev.getMonth()
  }

  const cycleDueDate = getCycleDueDate(cycleYear, cycleMonth, dueDay)
  const cycleKey = getMonthKey(new Date(cycleYear, cycleMonth, 1))

  return { cycleKey, cycleDueDate }
}

function isBillApplicableToCycle(
  bill: {
    startDate?: string
    dueDate?: string
    endDate?: string | null
  },
  cycleDueDate: Date
) {
  const start = parseDateOnly(bill.startDate ?? bill.dueDate ?? null)
  if (start && cycleDueDate.getTime() < start.getTime()) return false

  const end = parseDateOnly(bill.endDate)
  if (end && cycleDueDate.getTime() > end.getTime()) return false

  return true
}

export interface FinanceStatusProps {
  period: {
    income: number
    expense: number
    balance: number
    incomeChange: number
    expenseChange: number
    balanceChange: number
  }
  accumulated: {
    totalIncome: number
    totalExpense: number
    totalBalance: number
  }
  isLoading: boolean
  periodLabel?: string
}

export default function FinanceStatus({
  period,
  accumulated,
  isLoading,
  periodLabel = 'periodo anterior',
}: FinanceStatusProps) {
  const { fixedAccountsQuery } = useFixedAccounts()
  const [showValues, setShowValues] = useState(true)
  const storageKey = 'flynance:finance-status:show-values'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(storageKey)
    if (stored === '0') setShowValues(false)
    if (stored === '1') setShowValues(true)
  }, [])

  const toggleShowValues = () => {
    setShowValues((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, next ? '1' : '0')
      }
      return next
    })
  }

  const fmt = (v?: number) =>
    typeof v === 'number' && Number.isFinite(v)
      ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'R$ 0,00'

  const maskedValue = (v: number) => (showValues ? fmt(v) : 'R$ ••••')
  const visibilityLabel = showValues ? 'Ocultar valores' : 'Mostrar valores'
  const visibilityIcon = showValues ? <EyeOff size={16} /> : <Eye size={16} />

  const reminder = useMemo<ReminderStatus | null>(() => {
    const bills = fixedAccountsQuery.data ?? []
    if (!Array.isArray(bills) || bills.length === 0) return null

    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const msDay = 1000 * 60 * 60 * 24

    let overdueCount = 0
    const upcoming = bills
      .filter((b) => b && b.name && b.dueDay && b.status !== 'canceled')
      .map((b) => {
        const { cycleDueDate, cycleKey } = getCycleInfo(b.dueDay, 10, startOfToday)
        if (!isBillApplicableToCycle(b, cycleDueDate)) return null

        const paymentKey = resolvePaymentCycleKey(b)
        const paidThisMonth =
          b.payment == null
            ? Boolean(b.isPaid)
            : Boolean(paymentKey && paymentKey === cycleKey)

        if (paidThisMonth) return null

        if (cycleDueDate.getTime() < startOfToday.getTime()) {
          overdueCount += 1
          return null
        }

        const diffDays = Math.ceil((cycleDueDate.getTime() - startOfToday.getTime()) / msDay)
        return { diffDays }
      })
      .filter((x): x is { diffDays: number } => !!x && x.diffDays >= 0 && x.diffDays <= REMINDER_DAYS)
      .sort((a, b) => a.diffDays - b.diffDays)

    if (overdueCount > 0) return { variant: 'overdue', count: overdueCount }
    if (upcoming.length > 0) {
      return { variant: 'due', count: upcoming.length, nextInDays: upcoming[0].diffDays }
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
      : ''

  const reminderTitle =
    reminder?.variant === 'overdue' ? (
      <h2 className="text-red-600 font-medium flex justify-between items-center gap-1">
        <span className="flex items-center gap-2">
          <AlertTriangle /> Contas em atraso
        </span>
        <span className="text-xs font-medium text-red-500">
          {reminder.count} conta{reminder.count === 1 ? '' : 's'} pendente{reminder.count === 1 ? '' : 's'}
        </span>
      </h2>
    ) : reminder?.variant === 'due' ? (
      <h2 className="text-amber-600 font-medium flex justify-between items-center gap-1">
        <span className="flex items-center gap-2">
          <Bell /> Contas a vencer
        </span>
        <span className="text-xs font-medium text-amber-600">
          {reminder.count} conta{reminder.count === 1 ? '' : 's'} nos proximos {REMINDER_DAYS} dias
        </span>
      </h2>
    ) : (
      <h2 className=" text-emerald-600 font-medium flex justify-between items-center gap-1">
        <span className="flex items-center gap-2">
          <CheckCircle2 /> Contas em dia
        </span>
        <span className="text-xs font-medium text-emerald-600">Sem vencimento imediato</span>
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
            ? 'Nenhuma pendencia'
            : `${reminder.count} conta${reminder.count === 1 ? '' : 's'}`
        }
        periodLabel={reminderLabel}
        isLabel
      />
    </Link>
  )

  return (
    <div className="w-full">
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
                  <div className="flex items-center justify-between gap-3">
                    <h2
                      className={`font-medium flex gap-2 ${
                        balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'
                      }`}
                    >
                      <Wallet /> Saldo
                    </h2>
                    <button
                      type="button"
                      onClick={toggleShowValues}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                      aria-label={visibilityLabel}
                      title={visibilityLabel}
                    >
                      {visibilityIcon}
                    </button>
                  </div>
                }
                value={maskedValue(balance)}
                isLabel
                isBalance
              />
            </TabPanel>

            <TabPanel>
              <FinanceCard
                percentage={incomeChange}
                periodLabel={periodLabel}
                title={
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[#41B46B] font-medium flex gap-2">
                      <ArrowUp /> Receita
                    </h2>
                    <button
                      type="button"
                      onClick={toggleShowValues}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                      aria-label={visibilityLabel}
                      title={visibilityLabel}
                    >
                      {visibilityIcon}
                    </button>
                  </div>
                }
                value={maskedValue(income)}
                isLabel
              />
            </TabPanel>

            <TabPanel>
              <FinanceCard
                percentage={expenseChange}
                periodLabel={periodLabel}
                title={
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[#F15959] font-medium flex gap-2">
                      <ArrowDown /> Despesas
                    </h2>
                    <button
                      type="button"
                      onClick={toggleShowValues}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                      aria-label={visibilityLabel}
                      title={visibilityLabel}
                    >
                      {visibilityIcon}
                    </button>
                  </div>
                }
                value={maskedValue(expense)}
                isExpense
                isLabel
              />
            </TabPanel>

            {hasBills && reminder && <TabPanel>{reminderCard}</TabPanel>}
          </TabPanels>
        </TabGroup>
      </div>

      <div className="hidden lg:grid lg:grid-flow-col gap-4 lg:gap-4">
        <FinanceCard
          title={
            <div className="flex items-center justify-between gap-3">
              <h2
                className={`font-medium flex gap-2 ${
                  balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'
                }`}
              >
                <Wallet /> Saldo
              </h2>
              <button
                type="button"
                onClick={toggleShowValues}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label={visibilityLabel}
                title={visibilityLabel}
              >
                {visibilityIcon}
              </button>
            </div>
          }
          value={maskedValue(balance)}
          periodLabel={periodLabel}
          isLabel
          isBalance
        />
        <FinanceCard
          percentage={incomeChange}
          periodLabel={periodLabel}
          title={
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[#41B46B] font-medium flex gap-2">
                <ArrowUp /> Receita
              </h2>
              <button
                type="button"
                onClick={toggleShowValues}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label={visibilityLabel}
                title={visibilityLabel}
              >
                {visibilityIcon}
              </button>
            </div>
          }
          value={maskedValue(income)}
          isLabel
        />
        <FinanceCard
          percentage={expenseChange}
          periodLabel={periodLabel}
          title={
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[#F15959] font-medium flex gap-2">
                <ArrowDown /> Despesas
              </h2>
              <button
                type="button"
                onClick={toggleShowValues}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label={visibilityLabel}
                title={visibilityLabel}
              >
                {visibilityIcon}
              </button>
            </div>
          }
          value={maskedValue(expense)}
          isExpense
          isLabel
        />
        {hasBills && reminderCard}
      </div>
    </div>
  )
}
