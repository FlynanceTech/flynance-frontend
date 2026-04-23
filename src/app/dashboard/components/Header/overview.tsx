'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { NewTransactionButton } from '../Buttons'
import { CategoriesSelectWithCheck } from '../CategorySelect'
import SearchBar from '../SearchBar'
import TransactionDrawer from '../TransactionDrawer'
import DateRangeSelect from '../DateRangeSelect'

import { useUserSession } from '@/stores/useUserSession'
import { useTransactionFilter } from '@/stores/useFilter'
import { toFutureRangeFromDays, toRangeFromDays } from '@/utils/transactionPeriod'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { isAdvisorReadOnlyTransactionAccess } from '@/utils/transactionWriteAccess'
import type { Category } from '@/types/Transaction'
import { useFinancialScope } from '@/hooks/useFinancialScope'

interface HeaderProps {
  title?: string
  subtitle: string
  asFilter?: boolean
  dataToFilter?: Category[]
  newTransation?: boolean
  userId: string
  showFutureFilter?: boolean
  canWriteTransactions?: boolean
  rightContent?: React.ReactNode
}

type AnyDateFilter =
  | { mode: 'days'; days: number }
  | { mode: 'month'; month: string; year: string }
  | { mode: 'range'; start: string; end: string }

function diffDaysInclusive(start: string, end: string) {
  const s = new Date(start + 'T00:00:00').getTime()
  const e = new Date(end + 'T00:00:00').getTime()
  const ms = 24 * 60 * 60 * 1000
  return Math.max(1, Math.floor((e - s) / ms) + 1)
}

function parseISODate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function asFullMonthRange(start: string, end: string): { month: string; year: string } | null {
  const startDate = parseISODate(start)
  const endDate = parseISODate(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null

  const sameMonth =
    startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()
  if (!sameMonth) return null

  const firstDayOk = startDate.getDate() === 1
  const lastDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()
  const lastDayOk = endDate.getDate() === lastDayOfMonth
  if (!firstDayOk || !lastDayOk) return null

  return {
    month: String(startDate.getMonth() + 1).padStart(2, '0'),
    year: String(startDate.getFullYear()),
  }
}

function monthToRange(month: string, year: string): { start: string; end: string } | null {
  const mm = Number(month)
  const yy = Number(year)
  if (!Number.isInteger(mm) || mm < 1 || mm > 12) return null
  if (!Number.isInteger(yy) || yy < 1) return null

  const start = `${String(yy)}-${String(mm).padStart(2, '0')}-01`
  const lastDay = new Date(yy, mm, 0).getDate()
  const end = `${String(yy)}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export default function Header({
  subtitle,
  asFilter = false,
  dataToFilter,
  newTransation = true,
  showFutureFilter = false,
  canWriteTransactions: canWriteTransactionsProp = true,
  rightContent,
}: HeaderProps) {
  const t = useTranslations('dashboardHeader')
  const tScope = useTranslations('financialScope')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isApplyingFilters, setIsApplyingFilters] = useState(false)
  const { canSelectScope, scope } = useFinancialScope()
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const activePermission = useAdvisorActing((s) => s.activePermission ?? s.selectedPermission)
  const isAdvisorReadOnly = isAdvisorReadOnlyTransactionAccess(activeClientId, activePermission)
  const canWriteTransactions = canWriteTransactionsProp && !isAdvisorReadOnly
  const canCreateTransactions = Boolean(newTransation && canWriteTransactions)

  const { user } = useUserSession()
  const firstName =
    user?.userData?.user?.name?.split(' ')[0]?.toLowerCase()?.replace(/^\w/, (c) => c.toUpperCase()) ?? ''

  const mode = useTransactionFilter((s) => s.mode)
  const dateRange = useTransactionFilter((s) => s.dateRange)
  const selectedMonth = useTransactionFilter((s) => s.selectedMonth)
  const selectedYear = useTransactionFilter((s) => s.selectedYear)
  const includeFuture = useTransactionFilter((s) => s.includeFuture)
  const rangeStart = useTransactionFilter((s) => s.rangeStart)
  const rangeEnd = useTransactionFilter((s) => s.rangeEnd)

  const appliedMode = useTransactionFilter((s) => s.appliedMode)
  const appliedDateRange = useTransactionFilter((s) => s.appliedDateRange)
  const appliedMonth = useTransactionFilter((s) => s.appliedSelectedMonth)
  const appliedYear = useTransactionFilter((s) => s.appliedSelectedYear)
  const appliedIncludeFuture = useTransactionFilter((s) => s.appliedIncludeFuture)
  const appliedRangeStart = useTransactionFilter((s) => s.appliedRangeStart)
  const appliedRangeEnd = useTransactionFilter((s) => s.appliedRangeEnd)

  const setMode = useTransactionFilter((s) => s.setMode)
  const setDateRange = useTransactionFilter((s) => s.setDateRange)
  const setSelectedMonth = useTransactionFilter((s) => s.setSelectedMonth)
  const setSelectedYear = useTransactionFilter((s) => s.setSelectedYear)
  const setRangeStart = useTransactionFilter((s) => s.setRangeStart)
  const setRangeEnd = useTransactionFilter((s) => s.setRangeEnd)
  const setIncludeFuture = useTransactionFilter((s) => s.setIncludeFuture)
  const applyFilters = useTransactionFilter((s) => s.applyFilters)

  const datePickerValue: AnyDateFilter = useMemo(() => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return {
        mode: 'range',
        start: rangeStart,
        end: rangeEnd,
      }
    }

    if (mode === 'month' && selectedMonth && selectedYear) {
      return {
        mode: 'month',
        month: selectedMonth,
        year: selectedYear,
      }
    }

    return {
      mode: 'days',
      days: Number(dateRange || 30),
    }
  }, [mode, dateRange, selectedMonth, selectedYear, rangeStart, rangeEnd])

  function handleDateChange(next: AnyDateFilter) {
    if (next?.mode === 'days') {
      const safeDays = Number(next.days || 30)
      const range = includeFuture
        ? toFutureRangeFromDays(safeDays)
        : toRangeFromDays(safeDays)
      setMode('days')
      setDateRange(safeDays)
      setRangeStart(range.start)
      setRangeEnd(range.end)
      setSelectedMonth('')
      setSelectedYear('')
      return
    }

    if (next?.mode === 'month') {
      const monthRange = monthToRange(next.month, next.year)
      setMode('month')
      setSelectedMonth(next.month || '')
      setSelectedYear(next.year || '')
      if (monthRange) {
        setRangeStart(monthRange.start)
        setRangeEnd(monthRange.end)
      }
      return
    }

    if (next?.mode === 'range') {
      const fullMonth = asFullMonthRange(next.start, next.end)
      if (fullMonth) {
        setMode('month')
        setSelectedMonth(fullMonth.month)
        setSelectedYear(fullMonth.year)
        setRangeStart(next.start)
        setRangeEnd(next.end)
        return
      }

      const days = diffDaysInclusive(next.start, next.end)
      setMode('range')
      setDateRange(days)
      setRangeStart(next.start)
      setRangeEnd(next.end)
      setSelectedMonth('')
      setSelectedYear('')
    }
  }

  const hasPendingFilters =
    mode !== appliedMode ||
    Number(dateRange || 30) !== Number(appliedDateRange || 30) ||
    (selectedMonth || '') !== (appliedMonth || '') ||
    (selectedYear || '') !== (appliedYear || '') ||
    includeFuture !== appliedIncludeFuture ||
    (rangeStart || '') !== (appliedRangeStart || '') ||
    (rangeEnd || '') !== (appliedRangeEnd || '')

  const handleApplyFilters = () => {
    if (!hasPendingFilters || isApplyingFilters) return
    setIsApplyingFilters(true)
    applyFilters()
    setTimeout(() => setIsApplyingFilters(false), 400)
  }

  useEffect(() => {
    if (!hasPendingFilters) {
      setIsApplyingFilters(false)
    }
  }, [hasPendingFilters])

  const desktopFilterLabel = isApplyingFilters
    ? t('applying')
    : hasPendingFilters
    ? t('apply')
    : t('filter')

  const mobileFilterLabel = isApplyingFilters
    ? t('applying')
    : hasPendingFilters
    ? t('apply')
    : t('applied')

  return (
    <header className="flex flex-col px-6 pt-6">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 items-center">
          <h3 className="col-span-1 text-[1.7rem] font-bold text-[#333C4D] lg:text-[2rem]">
            {t('greeting', { name: firstName })}
          </h3>

          <div className="col-span-2 flex w-full items-center justify-end gap-2">
            {rightContent}

            <div className="hidden lg:flex gap-4 items-center justify-end">
              {asFilter && (
                <div className="flex gap-4 items-center">
                  {dataToFilter && (
                    <div className="flex gap-4 items-center">
                      <SearchBar />
                      <CategoriesSelectWithCheck />
                    </div>
                  )}

                  <DateRangeSelect
                    value={datePickerValue as any}
                    onChange={handleDateChange as any}
                    includeFuture={showFutureFilter ? includeFuture : undefined}
                    onIncludeFutureChange={showFutureFilter ? setIncludeFuture : undefined}
                    withDisplay
                  />
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    disabled={!hasPendingFilters || isApplyingFilters}
                    className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2">
                      {isApplyingFilters && (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                      )}
                      {desktopFilterLabel}
                    </span>
                  </button>
                </div>
              )}

              {canCreateTransactions && <NewTransactionButton onClick={() => setDrawerOpen(true)} />}
            </div>

            <div className="flex lg:hidden gap-4 items-center justify-end">
              <DateRangeSelect
                value={datePickerValue as any}
                onChange={handleDateChange as any}
                includeFuture={showFutureFilter ? includeFuture : undefined}
                onIncludeFutureChange={showFutureFilter ? setIncludeFuture : undefined}
              />
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={!hasPendingFilters || isApplyingFilters}
                className="h-9 rounded-full bg-primary px-4 text-xs font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  {isApplyingFilters && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  )}
                  {mobileFilterLabel}
                </span>
              </button>
            </div>
          </div>
        </div>

        {canCreateTransactions && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="fixed bottom-20 right-4 bg-secondary/30 text-black rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg z-40 sm:hidden"
          >
            <Plus />
          </button>
        )}

        <TransactionDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          readOnly={!canWriteTransactions}
        />
      </div>

      <div className="flex flex-col gap-2 pt-2 md:pt-0">
        <p className="whitespace-pre-line text-sm font-light text-slate-500">{subtitle}</p>
        {canSelectScope && (
          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {scope === 'me' ? tScope('badge.me') : tScope('badge.house')}
          </span>
        )}
      </div>
    </header>
  )
}
