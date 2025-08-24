'use client'

import { CalendarDays } from 'lucide-react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useMemo } from 'react'
import { format } from 'date-fns'

export type DateFilter =
  | { mode: 'days'; days: number }
  | { mode: 'month'; month: string; year: string } // month: "01".."12", year: "2025"

const dayOptions = [7, 15, 30, 60, 90, 180]

function getLastMonths(count = 12) {
  const months: { label: string; month: string; year: string }[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label =
      d.toLocaleString('pt-BR', { month: 'short' }) + ' ' + d.getFullYear()
    months.push({
      label,
      month: String(d.getMonth() + 1).padStart(2, '0'),
      year: String(d.getFullYear()),
    })
  }
  return months
}

interface Props {
  value: DateFilter
  onChange: (next: DateFilter) => void
  monthsCount?: number
  className?: string
  withDisplay?: boolean
}

export default function DateRangeSelect({
  value,
  onChange,
  monthsCount = 12,
  className,
  withDisplay = false
}: Props) {
  const monthOptions = useMemo(() => getLastMonths(monthsCount), [monthsCount])

  const displayText = value.mode === 'days'
    ? `Últimos ${value.days} dias`
    : format(new Date(`${monthsCount}-01`), "MMMM 'de' yyyy")

  return (
    <Menu>
      <MenuButton
        className={
          className ??
          `h-9 ${withDisplay  ? ' px-4 py-2' :'w-9 p-0' }  flex items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-[#1A202C] text-sm font-medium  hover:bg-gray-50 cursor-pointer`
        }
        aria-label="Selecionar período"
        title="Selecionar período"
      >
        {
          withDisplay &&
          <h3 className='hidden md:block'>
            {displayText}
          </h3>
        }
        <CalendarDays size={18} />

      </MenuButton>

      <MenuItems
        anchor="bottom"
        className="bg-white origin-top-right rounded-xl border border-[#E2E8F0] p-2 text-sm text-[#1A202C] shadow-lg focus:outline-none z-50 lg:mt-0 mt-2"
      >
        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">
          Filtrar por período
        </div>

        <div className="grid grid-cols-3 gap-2 px-2">
          {dayOptions.map((day) => (
            <MenuItem key={day} as="button"
              onClick={() => onChange({ mode: 'days', days: day })}
              className={`px-2 py-1 text-center rounded data-[focus]:bg-green-100 ${
                value.mode === 'days' && value.days === day
                  ? 'bg-green-50 text-green-700'
                  : ''
              }`}
            >
              {day} dias
            </MenuItem>
          ))}
        </div>

        <div className="my-2 h-px w-full bg-gray-200" />

        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">
          Ou selecione um mês
        </div>

        <div className="grid grid-cols-3 gap-2 px-2 pb-2">
          {monthOptions.map(({ label, month, year }) => {
            const isActive =
              value.mode === 'month' &&
              value.month === month &&
              value.year === year
            return (
              <MenuItem key={`${year}-${month}`} as="button"
                onClick={() => onChange({ mode: 'month', month, year })}
                className={`px-1 flex items-center justify-center rounded data-[focus]:bg-green-100 ${
                  isActive ? 'bg-green-50 text-green-700' : ''
                }`}
              >
                {label}
              </MenuItem>
            )
          })}
        </div>
      </MenuItems>
    </Menu>
  )
}
