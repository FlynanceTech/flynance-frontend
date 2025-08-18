'use client'

import { CalendarDays, ChevronDown } from 'lucide-react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useTransactionFilter } from '@/stores/useFilter'
import { format } from 'date-fns'

const dayOptions = [7, 15, 30, 60, 90, 180]
function getLastMonths(count = 12) {
  const months = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = date.toLocaleString('pt-BR', { month: 'short' }) + ' ' + date.getFullYear()
    const value = { month: String(date.getMonth() + 1).padStart(2, '0'), year: String(date.getFullYear()), label }
    months.push(value)
  }

  return months
}

const monthOptions = getLastMonths(12)

export default function DateRangeSelect() {
  const mode = useTransactionFilter((s) => s.mode)
  const setMode = useTransactionFilter((s) => s.setMode)
  const dateRange = useTransactionFilter((s) => s.dateRange)
  const setDateRange = useTransactionFilter((s) => s.setDateRange)
  const selectedMonth = useTransactionFilter((s) => s.selectedMonth)
  const setSelectedMonth = useTransactionFilter((s) => s.setSelectedMonth)
  const setSelectedYear = useTransactionFilter((s) => s.setSelectedYear)

  const displayText = mode === 'days'
    ? `Últimos ${dateRange} dias`
    : format(new Date(`${selectedMonth}-01`), "MMMM 'de' yyyy")

  return (
    <Menu>
      <MenuButton className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-full border border-[#E2E8F0] 
      bg-white text-[#1A202C] text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer">
        <CalendarDays size={16} />
        {displayText}
        <ChevronDown size={16} />
      </MenuButton>

      <MenuItems
        anchor="bottom"
        className="bg-white origin-top-right rounded-xl border border-[#E2E8F0] p-2 text-sm text-[#1A202C] shadow-lg focus:outline-none z-50 lg:mt-0 mt-2"
      >
        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Filtrar por período</div>
        <div className="grid grid-cols-3 gap-2 px-2">
          {dayOptions.map((day) => (
            <MenuItem key={day} as="button"
              onClick={() => {
                setMode('days')
                setDateRange(day)
              }}
              className="data-[focus]:bg-green-100 px-2 py-1 text-center rounded"
            >
              {day} dias
            </MenuItem>
          ))}
        </div>

        <div className="my-2 h-px w-full bg-gray-200" />

        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Ou selecione um mês</div>
        <div className="grid grid-cols-3 gap-2 px-2 pb-2">
          {monthOptions.map(({ label, month, year }) => (
            <MenuItem key={`${month}-${year}`}>
              <button
                onClick={() => {
                  setSelectedMonth(month)
                  setSelectedYear(year)
                  setMode('month')
                }}
                className="data-focus:bg-green-100 px-1 flex items-center justify-center rounded"
              >
                {label}
              </button>
            </MenuItem>
          ))}
        </div>
      </MenuItems>
    </Menu>
  )
}
