'use client'

import { CalendarDays } from 'lucide-react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

export type DateFilter =
  | { mode: 'days'; days: number }
  | { mode: 'month'; month: string; year: string } // month: "01".."12", year: "2025"

const dayOptions = [7, 15, 30, 60, 90, 180]

const monthNames = [
  { label: 'jan', value: '01' },
  { label: 'fev', value: '02' },
  { label: 'mar', value: '03' },
  { label: 'abr', value: '04' },
  { label: 'mai', value: '05' },
  { label: 'jun', value: '06' },
  { label: 'jul', value: '07' },
  { label: 'ago', value: '08' },
  { label: 'set', value: '09' },
  { label: 'out', value: '10' },
  { label: 'nov', value: '11' },
  { label: 'dez', value: '12' },
]

interface Props {
  value: DateFilter
  onChange: (next: DateFilter) => void
  /** Quantos anos para trás mostrar (ex.: 5 → ano atual e 4 anteriores) */
  monthsCount?: number // reaproveitada como "quantidade de anos"
  className?: string
  withDisplay?: boolean
}

export default function DateRangeSelect({
  value,
  onChange,
  monthsCount = 5,
  className,
  withDisplay = false,
}: Props) {
  const now = new Date()

  const activeMonth =
    value.mode === 'month'
      ? value.month
      : String(now.getMonth() + 1).padStart(2, '0')

  const activeYear =
    value.mode === 'month' ? value.year : String(now.getFullYear())

  const currentYear = now.getFullYear()
  const yearOptions = Array.from({ length: monthsCount }, (_, i) => currentYear - i)

  const displayText =
    value.mode === 'days'
      ? `Últimos ${value.days} dias`
      : new Date(Number(value.year), Number(value.month) - 1, 1).toLocaleDateString(
          'pt-BR',
          { month: 'long', year: 'numeric' }
        )

  return (
    <Menu>
      <MenuButton
        className={
          className ??
          `h-9 ${
            withDisplay ? ' px-4 py-2' : 'w-9 p-0'
          } flex items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 cursor-pointer`
        }
        aria-label="Selecionar período"
        title="Selecionar período"
      >
        {withDisplay && (
          <h3 className="hidden md:block">
            {displayText}
          </h3>
        )}
        <CalendarDays size={18} />
      </MenuButton>

      <MenuItems
        anchor="bottom"
        className="bg-white origin-top-right rounded-xl border border-[#E2E8F0] p-2 text-sm text-[#1A202C] shadow-lg focus:outline-none z-50 lg:mt-0 mt-2"
      >
        {/* ---- Filtro por dias ---- */}
        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">
          Filtrar por período
        </div>

        <div className="grid grid-cols-3 gap-2 px-2">
          {dayOptions.map((day) => (
            <MenuItem
              key={day}
              as="button"
              onClick={() => onChange({ mode: 'days', days: day })}
              className={`px-2 py-1 text-center rounded data-[focus]:bg-secondary/30 ${
                value.mode === 'days' && 'days' in value && value.days === day
                  ? 'bg-secondary/30 text-primary'
                  : ''
              }`}
            >
              {day} dias
            </MenuItem>
          ))}
        </div>

        <div className="my-2 h-px w-full bg-gray-200" />

        {/* ---- Mês (somente meses, sem ano no label) ---- */}
        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">
          Selecione um mês
        </div>

        <div className="grid grid-cols-3 gap-2 px-2">
          {monthNames.map(({ label, value: mValue }) => {
            const isActive = value.mode === 'month' && value.month === mValue
            return (
              <MenuItem
                key={mValue}
                as="button"
                onClick={() =>
                  onChange({
                    mode: 'month',
                    month: mValue,
                    year: activeYear, // mantém o ano atualmente selecionado
                  })
                }
                className={`px-1 py-1 flex items-center justify-center rounded text-xs data-[focus]:bg-secondary/30 ${
                  isActive ? 'bg-secondary/30 text-primary' : ''
                }`}
              >
                {label}.
              </MenuItem>
            )
          })}
        </div>

        <div className="my-2 h-px w-full bg-gray-200" />

        {/* ---- Ano (separado) ---- */}
        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">
          Selecione um ano
        </div>

        <div className="flex flex-wrap gap-2 px-2 pb-2">
          {yearOptions.map((year) => {
            const yearStr = String(year)
            const isActive = value.mode === 'month' && value.year === yearStr

            return (
              <MenuItem
                key={yearStr}
                as="button"
                onClick={() =>
                  onChange({
                    mode: 'month',
                    month: activeMonth, // mantém o mês atual
                    year: yearStr,
                  })
                }
                className={`px-2 py-1 rounded text-xs data-[focus]:bg-secondary/30 ${
                  isActive ? 'bg-secondary/30 text-primary' : ''
                }`}
              >
                {yearStr}
              </MenuItem>
            )
          })}
        </div>
      </MenuItems>
    </Menu>
  )
}
