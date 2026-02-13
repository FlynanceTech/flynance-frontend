'use client'

import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { NewTransactionButton } from '../Buttons'
import { CategoriesSelectWithCheck } from '../CategorySelect'
import SearchBar from '../SearchBar'
import TransactionDrawer from '../TransactionDrawer'

import DateRangeSelect from '../DateRangeSelect'
import { useUserSession } from '@/stores/useUserSession'
import { useTransactionFilter } from '@/stores/useFilter'

import type { Category } from '@/types/Transaction'

interface HeaderProps {
  title?: string
  subtitle: string
  asFilter?: boolean
  dataToFilter?: Category[]
  newTransation?: boolean
  userId: string
  showFutureFilter?: boolean
}

/**
 * ✅ Aceita formatos diferentes do DateRangeSelect (pra não quebrar se você estiver usando days/month ou days/range)
 * - days: { mode: 'days', days: number }
 * - month: { mode: 'month', month: '05', year: '2025' }
 * - range: { mode: 'range', start: '2026-01-01', end: '2026-01-31' }
 */
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

export default function Header({
  subtitle,
  asFilter = false,
  dataToFilter,
  newTransation = true,
  showFutureFilter = false,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { user } = useUserSession()
  const firstName =
    user?.userData?.user?.name?.split(' ')[0]?.toLowerCase()?.replace(/^\w/, (c) => c.toUpperCase()) ?? ''

  // ✅ zustand global filter
  const mode = useTransactionFilter((s) => s.mode)
  const dateRange = useTransactionFilter((s) => s.dateRange)
  const selectedMonth = useTransactionFilter((s) => s.selectedMonth)
  const selectedYear = useTransactionFilter((s) => s.selectedYear)
  const includeFuture = useTransactionFilter((s) => s.includeFuture)

  const appliedMode = useTransactionFilter((s) => s.appliedMode)
  const appliedDateRange = useTransactionFilter((s) => s.appliedDateRange)
  const appliedMonth = useTransactionFilter((s) => s.appliedSelectedMonth)
  const appliedYear = useTransactionFilter((s) => s.appliedSelectedYear)
  const appliedIncludeFuture = useTransactionFilter((s) => s.appliedIncludeFuture)

  const setMode = useTransactionFilter((s) => s.setMode)
  const setDateRange = useTransactionFilter((s) => s.setDateRange)
  const setSelectedMonth = useTransactionFilter((s) => s.setSelectedMonth)
  const setSelectedYear = useTransactionFilter((s) => s.setSelectedYear)
  const setIncludeFuture = useTransactionFilter((s) => s.setIncludeFuture)
  const applyFilters = useTransactionFilter((s) => s.applyFilters)

  // ✅ valor do DateRangeSelect derivado do store (sem state local)
  const datePickerValue: AnyDateFilter = useMemo(() => {
    if (mode === 'month') {
      return {
        mode: 'month',
        month: selectedMonth || '',
        year: selectedYear || '',
      }
    }

    return {
      mode: 'days',
      days: Number(dateRange || 30),
    }
  }, [mode, dateRange, selectedMonth, selectedYear])

  function handleDateChange(next: AnyDateFilter) {
    // - Se for "days": grava no store
    if (next?.mode === 'days') {
      setMode('days')
      setDateRange(Number(next.days || 30))
      setSelectedMonth('')
      setSelectedYear('')
      return
    }

    // - Se for "month": grava no store
    if (next?.mode === 'month') {
      setMode('month')
      setSelectedMonth(next.month || '')
      setSelectedYear(next.year || '')
      return
    }

    // - Se for "range": converte para "days" (store atual não tem start/end)
    if (next?.mode === 'range') {
      const days = diffDaysInclusive(next.start, next.end)
      setMode('days')
      setDateRange(days)
      setSelectedMonth('')
      setSelectedYear('')
    }
  }

  const hasPendingFilters =
    mode !== appliedMode ||
    Number(dateRange || 30) !== Number(appliedDateRange || 30) ||
    (selectedMonth || '') !== (appliedMonth || '') ||
    (selectedYear || '') !== (appliedYear || '') ||
    includeFuture !== appliedIncludeFuture

  const handleApplyFilters = () => {
    if (!hasPendingFilters) return
    applyFilters()
  }

  return (
    <header className="flex flex-col px-6 pt-6">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 items-center">
          <h3 className="text-2xl font-bold text-[#333C4D] col-span-2">Olá, {firstName}!</h3>
    
          {/* Desktop */}
          <div className="hidden lg:flex gap-4 items-center justify-end col-span-1">
            {asFilter && (
              <div className="flex gap-4 items-center">
                {dataToFilter && (
                  <div className="flex gap-4 items-center">
                    <SearchBar />
                    <CategoriesSelectWithCheck />
                  </div>
                )}

                {/* ✅ DateRangeSelect agora alimenta o filtro global */}
                <DateRangeSelect value={datePickerValue as any} onChange={handleDateChange as any} withDisplay />
                {showFutureFilter && (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={includeFuture}
                      onChange={(e) => setIncludeFuture(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                    />
                    Incluir futuros
                  </label>
                )}
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={!hasPendingFilters}
                  className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Filtrar
                </button>
              </div>
            )}

            {newTransation && <NewTransactionButton onClick={() => setDrawerOpen(true)} />}
          </div>

          {/* Mobile */}
          <div className="flex lg:hidden gap-4 items-center w-full justify-end col-span-1">
            <DateRangeSelect value={datePickerValue as any} onChange={handleDateChange as any} />
            {showFutureFilter && (
              <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={includeFuture}
                  onChange={(e) => setIncludeFuture(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                />
                Futuros
              </label>
            )}
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={!hasPendingFilters}
              className="h-9 rounded-full bg-primary px-4 text-xs font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Filtrar
            </button>
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

      <p className="text-sm font-light pt-2 md:pt-0">{subtitle}</p>
    </header>
  )
}
