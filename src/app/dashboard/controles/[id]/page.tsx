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

  const chartDataMap = new Map<string, { date: string; valor: number; acumulado: number }>()
  let acumulado = 0
  const chartData = control.transactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc, tx) => {
      const date = format(new Date(tx.date), 'yyyy-MM-dd')

      const existing = chartDataMap.get(date)
      if (existing) {
        existing.valor += tx.value
        existing.acumulado += tx.value
      } else {
        acumulado += tx.value
        const entry = { date, valor: tx.value, acumulado }
        chartDataMap.set(date, entry)
        acc.push(entry)
      }

      return acc
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
    <div className="flex flex-col w-full h-full lg:pr-8 pb-16 lg:pb-0 overflow-auto">
      <div
        className="bg-gradient-to-b from-secondary to-primary lg:bg-gradient-to-r lg:from-[#fff] lg:to-[#fff]
       p-8 rounded-b-3xl lg:rounded-b-2xl lg:rounded-t-2xl text-white lg:text-gray-600 flex flex-col gap-4"
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
        <div className="flex justify-between items-center">
          <h1 className="text-md font-bold flex gap-2 lg:text-gray-500">
            {IconMap[categoryIconName as IconName] &&
              React.createElement(IconMap[categoryIconName as IconName], { size: 22 })}
            {categoryName}
          </h1>
          <MonthSelector initialDate={selectedDate} onChange={setSelectedDate} />
        </div>
        <div className="p-4 lg:p-0 bg-white text-gray-500 rounded-md grid grid-cols-2 rounded-b-2xl">
          <div className="flex flex-col items-center justify-center border-r border-gray-300 gap lg:gap-2">
            <p className="font-semibold text-gray-400 text-sm lg:text-xl">{t('goal')}</p>
            <span className="text-lg lg:text-3xl ">{formatter(goal)}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap lg:gap-2">
            <p className="font-semibold text-gray-400 text-sm lg:text-xl">{t('currentSpent')}</p>
            <div className="flex flex-col text-center">
              <span className={`text-lg lg:text-3xl ${exceeded ? 'text-red-400' : 'text-gray-500'}`}>
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
              <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                <span className="text-xs text-gray-500">
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
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
      </div>

      <div className="p-8 pt-4 flex flex-col gap-4">
        <div className="flex flex-col">
          <SpendingChart data={chartData} spent={spent} goal={goal} />
          <p className="text-xs text-gray-400 text-center mt-2">{t('chartCaption')}</p>
        </div>
        <p className="font-semibold">{t('transactions')}</p>

        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 mt-4">{t('emptyTransactions')}</p>
        ) : (
          <ul className="list-none flex flex-col gap-4 ">
            {transactions.map((tx) => (
              <li key={tx.id} className="p-4 bg-white rounded-md">
                <div className="flex justify-between">
                  <span className="font-semibold">{tx.description}</span>
                  <span>{formatter(tx.value)}</span>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(tx.date).toLocaleDateString(locale)}
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
