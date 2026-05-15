'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import React, { use, useState } from 'react'
import { AlertTriangle, CheckCircle2, SquarePen, Undo2, XCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { useControls } from '@/hooks/query/useSpendingControl'
import { formatter } from '@/utils/formatter'
import { IconMap, IconName } from '@/utils/icon-map'
import { SpendingChart } from '../../components/SpendingChart'
import MonthSelector from '../../components/MonthSelector'
import SpendingControlDrawer from '../../components/SpendingControlDrawer'
import { useUserSession } from '@/stores/useUserSession'
import ControlDetailsSkeleton from './ControlDetailsSkeleton'
import { getActorFirstName } from '@/utils/actorName'

export interface Transaction {
  id: string
  userId: string
  value: number
  description: string
  categoryId: string
  date: string
  type: 'INCOME' | 'EXPENSE'
  paymentType: 'CASH' | 'CREDIT_CARD' | 'PIX' | string
  origin: 'DASHBOARD' | string
  cardId?: string
  createdByUser?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
  user?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
}

export interface ControlWithTransactions {
  id: string
  categoryId: string
  userId: string
  goal: number
  periodType: 'monthly' | string
  categoryName: string
  categoryIconName: string
  resetDay: number
  timezone: string
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: ('IN_APP' | 'EMAIL' | 'WHATSAPP')[]
  lastNotifiedAt: string | null
  nextCheckAt: string | null
  includeSubcategories: boolean
  isActive: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  periodStart: string
  periodEnd: string
  spent: number
  transactions: Transaction[]
}

type StatusKey = 'ok' | 'warning' | 'danger'

function getStatus(pct: number): StatusKey {
  if (pct > 90) return 'danger'
  if (pct > 60) return 'warning'
  return 'ok'
}

function formatDateWithActor(date: string, locale: string, actorName: string) {
  const formattedDate = new Date(date).toLocaleDateString(locale)
  return actorName ? `${formattedDate} • ${actorName}` : formattedDate
}

export default function ControlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = useTranslations('controlDetailsPage')
  const locale = useLocale()
  const currentUserId = useUserSession((state) => state.user?.userData?.user?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const { id } = use(params)
  const { controlsByIdQuery } = useControls(id, selectedDate)

  if (controlsByIdQuery.isLoading) return <ControlDetailsSkeleton />
  if (controlsByIdQuery.isError) return <p>{t('loadError')}</p>

  const control = controlsByIdQuery.data as ControlWithTransactions
  const { spent, goal, categoryIconName, categoryName, transactions } = control
  const canWriteControl = !control.userId || control.userId === currentUserId

  const chartData = [...control.transactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((rows, tx) => {
      const date = format(new Date(tx.date), 'yyyy-MM-dd')
      const last = rows.at(-1)

      if (last?.date === date) {
        return [
          ...rows.slice(0, -1),
          {
            ...last,
            valor: last.valor + tx.value,
            acumulado: last.acumulado + tx.value,
          },
        ]
      }

      const acumulado = (last?.acumulado ?? 0) + tx.value
      return [...rows, { date, valor: tx.value, acumulado }]
    }, [] as { date: string; valor: number; acumulado: number }[])

  const exceeded = spent > goal
  const percentage = (spent / goal) * 100
  const exceededAmount = spent - goal
  const status = getStatus(percentage)

  const STATUS: Record<
    StatusKey,
    {
      cls: string
      Icon: typeof CheckCircle2
      label: string
      bar: string
      textColor: string
    }
  > = {
    ok: {
      cls: 'text-primary',
      Icon: CheckCircle2,
      label: t('status.ok'),
      bar: 'bg-blue-500',
      textColor: 'text-blue-500',
    },
    warning: {
      cls: 'text-yellow-500',
      Icon: AlertTriangle,
      label: t('status.warning'),
      bar: 'bg-yellow-400',
      textColor: 'text-yellow-400',
    },
    danger: {
      cls: 'text-red-400',
      Icon: XCircle,
      label: t('status.danger'),
      bar: 'bg-red-500',
      textColor: 'text-red-400',
    },
  }

  const { Icon, cls, label, bar: color, textColor } = STATUS[status]

  return (
    <div className="flex h-full w-full flex-col overflow-auto pb-16 text-slate-900 dark:text-slate-100 lg:pr-8 lg:pb-0">
      <div
        className="flex flex-col gap-4 rounded-b-3xl rounded-t-none bg-gradient-to-b from-secondary to-primary p-8 text-white lg:rounded-2xl lg:bg-none lg:bg-white lg:text-slate-600 dark:from-slate-900 dark:to-slate-900 dark:text-slate-100 dark:lg:bg-slate-900"
      >
        <div className="flex justify-between">
          <Link href="/dashboard/controles" aria-label={t('back')}>
            <Undo2 />
          </Link>
          <h1 className="text-xl font-bold ">{t('title')}</h1>
          <button
            onClick={() => canWriteControl && setDrawerOpen(!drawerOpen)}
            aria-label={t('edit')}
            disabled={!canWriteControl}
          >
            <SquarePen />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-md flex gap-2 font-bold lg:text-slate-500 dark:lg:text-slate-300">
            {IconMap[categoryIconName as IconName] &&
              React.createElement(IconMap[categoryIconName as IconName], { size: 22 })}
            {categoryName}
          </h1>
          <MonthSelector initialDate={selectedDate} onChange={setSelectedDate} />
        </div>
        <div className="grid grid-cols-2 rounded-md rounded-b-2xl bg-white p-4 text-slate-600 shadow-sm ring-1 ring-slate-200/80 lg:p-0 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700/80">
          <div className="flex flex-col items-center justify-center gap border-r border-slate-300 py-2 lg:gap-2 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-400 lg:text-xl dark:text-slate-400">{t('goal')}</p>
            <span className="text-lg lg:text-3xl">{formatter(goal)}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap py-2 lg:gap-2">
            <p className="text-sm font-semibold text-slate-400 lg:text-xl dark:text-slate-400">{t('currentSpent')}</p>
            <div className="flex flex-col text-center">
              <span className={`text-lg lg:text-3xl ${exceeded ? 'text-red-400 dark:text-red-400' : 'text-slate-600 dark:text-slate-100'}`}>
                {formatter(spent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-8 pt-4 gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs px-2 py-1 rounded-full font-medium flex items-center">
            <span className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${cls}`} aria-hidden />
              <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {label}
                  {exceeded && <span> {formatter(exceededAmount)}</span>}
                </span>
              </span>
            </span>
          </p>

          <p className={`text-xs font-semibold col-span-1 ${textColor}`}>
            {t('percentOfGoal', { percent: percentage.toFixed(0) })}
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
          <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
      </div>

      <div className="p-8 pt-4 flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <SpendingChart data={chartData} spent={spent} goal={goal} />
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">{t('chartCaption')}</p>
        </div>
        <p className="font-semibold text-slate-900 dark:text-slate-100">{t('transactions')}</p>

        {transactions.length === 0 ? (
          <p className="mt-4 text-center text-slate-400 dark:text-slate-500">{t('emptyTransactions')}</p>
        ) : (
          <ul className="list-none flex flex-col gap-4 ">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{tx.description}</span>
                  <span className="text-slate-900 dark:text-slate-100">{formatter(tx.value)}</span>
                </div>
                <span className="text-sm text-slate-400 dark:text-slate-500">
                  {formatDateWithActor(tx.date, locale, getActorFirstName(tx))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SpendingControlDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} editing={control} />
    </div>
  )
}
