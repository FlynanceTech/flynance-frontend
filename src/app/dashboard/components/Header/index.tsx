'use client'

import React, { useState } from 'react'
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react'
/* import NotificationBell from '../NotificationBell' */
import { ImportTransactionsButton, NewTransactionButton } from '../Buttons'
import { CategoriesSelectWithCheck } from '../CategorySelect'
import SearchBar from '../SearchBar'
import TransactionDrawer from '../TransactionDrawer'
import { Category } from '@/types/Transaction'
import { Plus, SlidersHorizontal, X } from 'lucide-react'
import CategoriesSelectWithChips from '../CategorySelect/CategoriesSelectWithChips'
import ActiveFiltersChips from './ActiveFiltersChips'
import QuickTypeFilter from './QuickTypeFilter'
import { useTransactionFilter } from '@/stores/useFilter'
import DateRangeSelect from '../DateRangeSelect'
import { toFutureRangeFromDays, toRangeFromDays } from '@/utils/transactionPeriod'

interface HeaderProps {
  title?: string
  subtitle: string  
  asFilter?: boolean
  asReport?: boolean
  dataToFilter?: Category[]
  newTransation?: boolean
  importTransations?: boolean
  onApplyFilters?: () => void
  onImportClick?: () => void
  importLoading?: boolean
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

export default function Header({ title, subtitle, asFilter = false, asReport = false, dataToFilter, newTransation = true, importTransations, onApplyFilters, onImportClick, importLoading, rightContent}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const searchTerm = useTransactionFilter((s) => s.searchTerm)
  const dateRange = useTransactionFilter((s) => s.dateRange)
  const typeFilter = useTransactionFilter((s) => s.typeFilter)
  const mode = useTransactionFilter((s) => s.mode)
  const includeFuture = useTransactionFilter((s) => s.includeFuture)
  const selectedMonth = useTransactionFilter((s) => s.selectedMonth)
  const selectedYear = useTransactionFilter((s) => s.selectedYear)
  const rangeStart = useTransactionFilter((s) => s.rangeStart)
  const rangeEnd = useTransactionFilter((s) => s.rangeEnd)

  const appliedCategories = useTransactionFilter((s) => s.appliedSelectedCategories)
  const appliedSearchTerm = useTransactionFilter((s) => s.appliedSearchTerm)
  const appliedDateRange = useTransactionFilter((s) => s.appliedDateRange)
  const appliedTypeFilter = useTransactionFilter((s) => s.appliedTypeFilter)
  const appliedMode = useTransactionFilter((s) => s.appliedMode)
  const appliedIncludeFuture = useTransactionFilter((s) => s.appliedIncludeFuture)
  const appliedMonth = useTransactionFilter((s) => s.appliedSelectedMonth)
  const appliedYear = useTransactionFilter((s) => s.appliedSelectedYear)
  const appliedRangeStart = useTransactionFilter((s) => s.appliedRangeStart)
  const appliedRangeEnd = useTransactionFilter((s) => s.appliedRangeEnd)

  const setMode = useTransactionFilter((s) => s.setMode)
  const setDateRange = useTransactionFilter((s) => s.setDateRange)
  const setIncludeFuture = useTransactionFilter((s) => s.setIncludeFuture)
  const setSelectedMonth = useTransactionFilter((s) => s.setSelectedMonth)
  const setSelectedYear = useTransactionFilter((s) => s.setSelectedYear)
  const setRangeStart = useTransactionFilter((s) => s.setRangeStart)
  const setRangeEnd = useTransactionFilter((s) => s.setRangeEnd)
  const applyFilters = useTransactionFilter((s) => s.applyFilters)

  const datePickerValue: AnyDateFilter = React.useMemo(() => {
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

    if (mode === 'range') {
      return {
        mode: 'range',
        ...toRangeFromDays(Number(dateRange || 30)),
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

  const sameCategoryIds = (a: { id: string | number }[], b: { id: string | number }[]) => {
    if (a.length !== b.length) return false
    const ids = new Set(a.map((c) => c.id))
    return b.every((c) => ids.has(c.id))
  }

  const hasPendingFilters =
    !sameCategoryIds(selectedCategories, appliedCategories) ||
    (searchTerm || '') !== (appliedSearchTerm || '') ||
    Number(dateRange || 30) !== Number(appliedDateRange || 30) ||
    typeFilter !== appliedTypeFilter ||
    includeFuture !== appliedIncludeFuture ||
    mode !== appliedMode ||
    (selectedMonth || '') !== (appliedMonth || '') ||
    (selectedYear || '') !== (appliedYear || '') ||
    (rangeStart || '') !== (appliedRangeStart || '') ||
    (rangeEnd || '') !== (appliedRangeEnd || '')

  const handleApplyFilters = () => {
    if (!hasPendingFilters) return
    applyFilters()
    onApplyFilters?.()
  }

  const filterButtonLabel = hasPendingFilters ? 'Aplicar filtro' : 'Filtrar'
  return (
    <header className='flex flex-col'>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between lg:pb-2 sm:px-0">
        <div className="w-full flex  md:flex-row justify-between md:items-center gap-2 mb-4">
          <h1 className="lg:text-xl text-base font-semibold text-[#333C4D]">{title}</h1>
  

          <div className="hidden lg:flex gap-4 items-center justify-end">
           {/*  <NotificationBell asFilter={asFilter} /> */}
           {
            importTransations &&
            <ImportTransactionsButton
              onClick={() => {
                if (onImportClick) onImportClick()
                else setDrawerOpen(true)
              }}
              disabled={importLoading}
              label={importLoading ? 'Importando...' : undefined}
            />
           }
            {
              newTransation &&
              <NewTransactionButton onClick={() => setDrawerOpen(true)} />
            }
          </div>
              {rightContent && (
              <div className="flex items-center gap-2">
                {rightContent}
              </div>
            )}
          <div className="flex lg:hidden gap-2 items-center ">
          
          {/*   <NotificationBell  asFilter={asFilter} /> */}
            {importTransations && (
              <ImportTransactionsButton
                onClick={() => {
                  if (onImportClick) onImportClick()
                  else setDrawerOpen(true)
                }}
                disabled={importLoading}
                label={importLoading ? 'Importando...' : 'Importar'}
              />
            )}
          
            {asFilter && (
            <Menu as="div" className="relative lg:hidden">
            {({ open, close }) => (
              <>
                <MenuButton className="p-1.5 rounded-md hover:bg-gray-100 transition cursor-pointer">
                  {open ? <X /> : <SlidersHorizontal />}
                </MenuButton>
          
                <Transition
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 mt-2 min-w-[90vw] bg-white shadow-lg rounded-md p-3 z-40 flex flex-col gap-3 outline-none">
                    {dataToFilter && (
                      <div className="min-w-full flex flex-col gap-3 items-stretch">
                        <QuickTypeFilter />
                        <SearchBar />
                        <DateRangeSelect
                          value={datePickerValue as any}
                          onChange={handleDateChange as any}
                          includeFuture={includeFuture}
                          onIncludeFutureChange={setIncludeFuture}
                          inline
                          withDisplay
                          className="w-full justify-between px-3"
                        />
                        <CategoriesSelectWithCheck
                          closeMenuOnSelect={false}
                          menuPortalTarget={null}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleApplyFilters()
                            close()
                          }}
                          disabled={!hasPendingFilters}
                          className="h-10 w-full rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {filterButtonLabel}
                        </button>

                      </div>
                    )}
                  </MenuItems>
                </Transition>
              </>
            )}
          </Menu>
            )}
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-20 right-4 bg-secondary/30 text-black rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg z-40 sm:hidden"
        >
          <Plus />
        </button>

        <TransactionDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>

          {asFilter && (
          <div className="gap-4 items-center hidden md:flex ">
          
            {dataToFilter && (
              <div className="flex gap-3 items-center w-full">
              <SearchBar />
              <QuickTypeFilter />
              <CategoriesSelectWithChips />
              <DateRangeSelect
                value={datePickerValue as any}
                onChange={handleDateChange as any}
                includeFuture={includeFuture}
                onIncludeFutureChange={setIncludeFuture}
                className="w-9 max-w-9"
              />
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={!hasPendingFilters}
                className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {filterButtonLabel}
              </button>
            </div>

            )}
          </div>
        )}
      
        <div className="text-sm font-light md:pt-0">
          <ActiveFiltersChips fallbackText={subtitle} />
        </div>
      </div>
    </header>
  )
}
