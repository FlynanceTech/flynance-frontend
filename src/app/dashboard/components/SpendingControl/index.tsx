'use client'

import React, { useMemo, useState } from 'react'
import { ClipboardList, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

import { useControls } from '@/hooks/query/useSpendingControl'
import SpendingControlDrawer from '../SpendingControlDrawer'
import { useCategories } from '@/hooks/query/useCategory'
import MonthSelector from '../MonthSelector'
import { formatCurrency } from '@/utils/formatter'

type Channel = 'IN_APP' | 'EMAIL' | 'WHATSAPP'

interface ControlWithProgress {
  id: string
  categoryId: string | null
  goal: number
  periodType: 'monthly'
  resetDay: number | null
  includeSubcategories: boolean
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: Channel[]
  periodStart: string
  periodEnd: string
  nextResetAt: string
  spent: number
  remainingToGoal: number
  usagePctOfGoal: number
  usagePctOfLimit: number
  overLimit: boolean
  isFavorite?: boolean
  favoriteAt?: string | null
}

type FavoriteFromApi = {
  id: string
  categoryId: string | null
  isFavorite?: boolean
  favoriteAt?: string | null
}

const toCurrency = (v: number): string => formatCurrency(v)

type StatusKey = 'ok' | 'warning' | 'danger'

function getStatus(control: ControlWithProgress): StatusKey {
  const usagePct = Number.isFinite(control.usagePctOfGoal)
    ? control.usagePctOfGoal
    : control.goal > 0
    ? (control.spent / control.goal) * 100
    : 0
  const isOverLimit = typeof control.overLimit === 'boolean' ? control.overLimit : control.spent > control.goal
  if (isOverLimit) return 'danger'
  if (usagePct >= 100) return 'warning'
  return 'ok'
}

function compareClosestToGoal(a: ControlWithProgress, b: ControlWithProgress) {
  const ap = Number.isFinite(a.usagePctOfGoal) ? a.usagePctOfGoal : a.goal > 0 ? (a.spent / a.goal) * 100 : 0
  const bp = Number.isFinite(b.usagePctOfGoal) ? b.usagePctOfGoal : b.goal > 0 ? (b.spent / b.goal) * 100 : 0

  const aDist = ap >= 100 ? 0 : 100 - ap
  const bDist = bp >= 100 ? 0 : 100 - bp

  if (aDist !== bDist) return aDist - bDist
  return bp - ap
}

export function SpendingControl() {
  const t = useTranslations('spendingControl')
  const locale = useLocale()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { controlsQuery, favoritesQuery } = useControls(undefined, selectedDate)
  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

  const categoryNameById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const c of categories) map[c.id] = c.name
    return map
  }, [categories])

  function formatPeriod(startISO: string, endISO: string): string {
    const start = new Date(startISO)
    const end = new Date(endISO)
    const sameMonthAndYear =
      start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()

    if (sameMonthAndYear) {
      const dayStart = start.toLocaleDateString(locale, { day: '2-digit' })
      const dayEnd = end.toLocaleDateString(locale, { day: '2-digit' })
      const tail = end.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
      return `${dayStart}-${dayEnd} ${tail}`
    }

    return `${start.toLocaleDateString(locale)} - ${end.toLocaleDateString(locale)}`
  }

  function formatNextReset(nextISO: string): string {
    if (!nextISO) return '--'
    const date = new Date(nextISO)
    if (Number.isNaN(date.getTime())) return '--'
    return date.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'short' })
  }

  const items = useMemo<ControlWithProgress[]>(() => {
    const all = (controlsQuery.data ?? []) as ControlWithProgress[]
    const favApi = (favoritesQuery?.data ?? []) as FavoriteFromApi[]

    const favoriteIdsFromApi = favApi.map((f) => f.id).filter(Boolean)

    if (favoriteIdsFromApi.length > 0) {
      const merged = favoriteIdsFromApi
        .map((id) => all.find((c) => c.id === id))
        .filter(Boolean) as ControlWithProgress[]

      return [...merged].sort(compareClosestToGoal).slice(0, 3)
    }

    const favoritesFromAll = all
      .filter((c) => c.isFavorite)
      .sort(compareClosestToGoal)
      .slice(0, 3)

    if (favoritesFromAll.length > 0) return favoritesFromAll

    return [...all].sort(compareClosestToGoal).slice(0, 3)
  }, [controlsQuery.data, favoritesQuery?.data])

  const isLoading = controlsQuery.isLoading || favoritesQuery?.isLoading
  const hasNoData = !isLoading && items.length === 0

  const statusConfig = {
    ok: { cls: 'text-primary', Icon: CheckCircle2, label: t('status.ok') },
    warning: { cls: 'text-yellow-500', Icon: AlertTriangle, label: t('status.warning') },
    danger: { cls: 'text-red-400', Icon: XCircle, label: t('status.danger') },
  } as const

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-gray-800">{t('title')}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:block">
            <MonthSelector initialDate={selectedDate} onChange={setSelectedDate} />
          </div>
          <Link
            href="/dashboard/controles"
            className="text-xs bg-secondary/30 hover:bg-secondary/35 text-primary px-4 py-2 rounded-full cursor-pointer hidden lg:block"
          >
            {t('myControls')}
          </Link>

          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 bg-secondary/30 text-primary font-semibold px-2 py-2 rounded-full text-sm hover:bg-secondary/35 cursor-pointer"
            aria-label={t('addControlAria')}
            title={t('addControlTitle')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="lg:hidden">
          <MonthSelector initialDate={selectedDate} onChange={setSelectedDate} />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : hasNoData ? (
          <div className="flex flex-col items-center justify-center text-sm text-gray-500 text-center py-8">
            <ClipboardList className="w-6 h-6 mb-2 text-gray-400" />
            {t('emptyMessage')}
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center lg:items-start w-full">
            {items.map((control) => {
              const catLabel = control.categoryId ? categoryNameById[control.categoryId] ?? t('defaultCategory') : t('general')
              const status = getStatus(control)
              const { Icon, cls, label } = statusConfig[status]
              const usagePct = Number.isFinite(control.usagePctOfGoal) ? control.usagePctOfGoal : control.goal > 0 ? (control.spent / control.goal) * 100 : 0
              const pct = Math.min(usagePct, 100)

              const barColor =
                usagePct <= 60
                  ? 'bg-blue-500'
                  : usagePct <= 80
                  ? 'bg-yellow-400'
                  : 'bg-red-500'

              return (
                <Link
                  href={`/dashboard/controles/${control.id}`}
                  key={control.id}
                  className="w-full relative space-y-1 border border-gray-100 rounded-lg p-2 hover:shadow-sm transition-all"
                >
                  <span
                    className={`absolute top-7 right-1 z-30 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                    ${
                      status === 'danger'
                        ? 'bg-red-600 text-white'
                        : status === 'warning'
                        ? 'bg-yellow-400 text-black'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {Math.round(usagePct)}%
                  </span>

                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cls}`} aria-hidden />
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                      {catLabel} <span className="text-xs text-gray-500">({label})</span>
                    </span>
                    <span className="text-xs text-gray-500">{t('goalPrefix')} {toCurrency(control.goal)}</span>
                  </div>

                  <div
                    className="w-full h-4 overflow-hidden relative"
                    title={`${t('spent')}: ${toCurrency(control.spent)} (${Math.round(pct)}%)`}
                  >
                    <div className="h-2 absolute top-[3px] bg-gray-200 w-full rounded-full" />

                    <div
                      className={`h-2 absolute top-[3px] z-10 ${barColor} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />

                    <div
                      className="absolute top-0 z-20 h-[16px] w-[4px] bg-gray-700 rounded-full"
                      style={{
                        left: `${Math.min(Math.max(control.notifyAtPct?.[0] ?? 80, 0), 100)}%`,
                        transform: 'translateX(-1px)',
                      }}
                      title={t('notifyFrom', { pct: control.notifyAtPct?.[0] ?? 80 })}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{t('period')}: {formatPeriod(control.periodStart, control.periodEnd)}</span>
                    <span>{t('reset')}: {formatNextReset(control.nextResetAt)}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span>{t('spent')}: {toCurrency(control.spent)}</span>
                    <span className={control.spent > control.goal ? 'text-red-400' : 'text-emerald-700'}>
                      {control.spent > control.goal
                        ? t('exceeded', { value: toCurrency(control.spent - control.goal) })
                        : t('remaining', { value: toCurrency(control.goal - control.spent) })}
                    </span>
                  </div>
                </Link>
              )
            })}

            <Link
              href="/dashboard/controles"
              className="text-xs bg-secondary/30 hover:bg-secondary/35 text-primary px-4 py-2 rounded-full cursor-pointer lg:hidden max-w-40 flex justify-center"
            >
              {t('myControls')}
            </Link>
            <p className="text-center text-xs text-gray-500">{t('footer')}</p>
          </div>
        )}
      </div>

      <SpendingControlDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

export default SpendingControl
