import { useMemo, useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

export type DateFilter =
  | { mode: 'days'; days: number }
  | { mode: 'month'; month: string; year: string } // month '01'..'12'
  | { mode: 'range'; start: string; end: string } // "YYYY-MM-DD"

const dayOptions = [7, 15, 30, 60, 90, 180]
const monthOptions = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Marco' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
] as const

interface Props {
  value: DateFilter
  onChange: (next: DateFilter) => void
  includeFuture?: boolean
  onIncludeFutureChange?: (next: boolean) => void
  className?: string
  withDisplay?: boolean
  inline?: boolean
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

function formatRangeDisplay(startISO: string, endISO: string) {
  const start = new Date(startISO + 'T00:00:00')
  const end = new Date(endISO + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${fmt(start)} - ${fmt(end)}`
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

function asFullMonthRange(start: string, end: string): { month: string; year: string } | null {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null

  const sameMonth =
    startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()
  if (!sameMonth) return null

  const isFirstDay = startDate.getDate() === 1
  const lastDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()
  const isLastDay = endDate.getDate() === lastDayOfMonth
  if (!isFirstDay || !isLastDay) return null

  return {
    month: pad2(startDate.getMonth() + 1),
    year: String(startDate.getFullYear()),
  }
}

function formatMonthDisplay(month: string, year: string): string {
  const mm = Number(month)
  const yy = Number(year)
  if (!Number.isInteger(mm) || mm < 1 || mm > 12 || !Number.isInteger(yy) || yy < 1) {
    return `${month}/${year}`
  }

  const date = new Date(yy, mm - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  return label.replace('.', '')
}

export default function DateRangeSelect({
  value,
  onChange,
  includeFuture = false,
  onIncludeFutureChange,
  className,
  withDisplay = false,
  inline = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => String(currentYear - 6 + index)),
    [currentYear]
  )

  const displayText = useMemo(() => {
    if (value.mode === 'days') {
      return includeFuture
        ? `Proximos ${value.days} dias`
        : `Ultimos ${value.days} dias`
    }
    if (value.mode === 'month') {
      return `Mes: ${formatMonthDisplay(value.month, value.year)}`
    }
    return `Periodo: ${formatRangeDisplay(value.start, value.end)}`
  }, [value, includeFuture])

  const defaultRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 29)
    return { start: toISODate(start), end: toISODate(end) }
  }, [])

  const [rangeDraft, setRangeDraft] = useState<{ start: string; end: string }>(() => {
    if (value.mode === 'range') return { start: value.start, end: value.end }
    if (value.mode === 'month') {
      return monthToRange(value.month, value.year) ?? defaultRange
    }
    return defaultRange
  })
  const [monthDraft, setMonthDraft] = useState<{ month: string; year: string }>(() => {
    if (value.mode === 'month') {
      return { month: value.month, year: value.year }
    }

    if (value.mode === 'range') {
      const fullMonth = asFullMonthRange(value.start, value.end)
      if (fullMonth) return fullMonth
    }

    return { month: pad2(new Date().getMonth() + 1), year: String(new Date().getFullYear()) }
  })

  useEffect(() => {
    if (value.mode === 'range') setRangeDraft({ start: value.start, end: value.end })
    if (value.mode === 'month') {
      const monthRange = monthToRange(value.month, value.year)
      if (monthRange) setRangeDraft(monthRange)
      setMonthDraft({ month: value.month, year: value.year })
    }
    if (value.mode === 'range') {
      const fullMonth = asFullMonthRange(value.start, value.end)
      if (fullMonth) {
        setMonthDraft(fullMonth)
      }
    }
  }, [value])

  const rangeIsValid = rangeDraft.start && rangeDraft.end && rangeDraft.start <= rangeDraft.end
  const monthIsValid = Boolean(monthToRange(monthDraft.month, monthDraft.year))

  const setStart = (start: string) => {
    setRangeDraft((prev) => ({ start, end: prev.end && start > prev.end ? start : prev.end }))
  }

  const setEnd = (end: string) => {
    setRangeDraft((prev) => ({ start: prev.start && end < prev.start ? end : prev.start, end }))
  }

  const baseButtonClass = `h-9 ${withDisplay ? 'px-4 py-2' : 'w-9 p-0'} flex  lg:max-w-44 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 cursor-pointer`
  const buttonClass = className ? `${baseButtonClass} ${className}` : baseButtonClass

  const futureToggle = onIncludeFutureChange ? (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={includeFuture}
        onChange={(e) => onIncludeFutureChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
      />
      Periodo futuro
    </label>
  ) : null

  if (inline) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={buttonClass}
          aria-label="Selecionar periodo"
          title="Selecionar periodo"
          onClick={() => setOpen(!open)}
        >
          {withDisplay && <h3 className={inline ? 'block' : 'hidden md:block'}>{displayText}</h3>}
          <CalendarDays size={18} />
        </button>
        {open && (
          <div className="bg-white origin-top-right rounded-xl border border-[#E2E8F0] p-2 text-sm text-[#1A202C] shadow-lg focus:outline-none z-50 lg:mt-0 mt-2 w-full">
            <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Selecionar intervalo</div>

            <div className="px-2 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-500">Inicio</span>
                  <input
                    type="date"
                    value={rangeDraft.start}
                    onChange={(e) => setStart(e.target.value)}
                    className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-500">Fim</span>
                  <input
                    type="date"
                    value={rangeDraft.end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
              </div>

              {!rangeIsValid && <div className="mt-2 text-[11px] text-red-600">O inicio nao pode ser depois do fim.</div>}

              <div className="mt-3 flex items-center justify-between gap-2">
                {futureToggle}
                <button
                  type="button"
                  disabled={!rangeIsValid}
                  onClick={() => onChange({ mode: 'range', start: rangeDraft.start, end: rangeDraft.end })}
                  className="text-xs px-4 py-2 rounded-full bg-primary hover:bg-secondary text-white font-semibold disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>

   
            </div>

            <div className="my-2 h-px w-full bg-gray-200" />

            <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Selecionar mes especifico</div>

            <div className="px-2 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-500">Mes</span>
                  <select
                    value={monthDraft.month}
                    onChange={(e) => setMonthDraft((prev) => ({ ...prev, month: e.target.value }))}
                    className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    {monthOptions.map((monthOption) => (
                      <option key={monthOption.value} value={monthOption.value}>
                        {monthOption.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-500">Ano</span>
                  <select
                    value={monthDraft.year}
                    onChange={(e) => setMonthDraft((prev) => ({ ...prev, year: e.target.value }))}
                    className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    {yearOptions.map((yearOption) => (
                      <option key={yearOption} value={yearOption}>
                        {yearOption}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!monthIsValid}
                  onClick={() => onChange({ mode: 'month', month: monthDraft.month, year: monthDraft.year })}
                  className="text-xs px-4 py-2 rounded-full bg-primary hover:bg-secondary text-white font-semibold disabled:opacity-50"
                >
                  Aplicar mes
                </button>
              </div>
            </div>

            <div className="my-2 h-px w-full bg-gray-200" />

            <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Filtrar por periodo de</div>

            <div className="grid grid-cols-3 gap-2 px-2">
              {dayOptions.map((day) => (
                <button
                  key={day}
                  onClick={() => onChange({ mode: 'days', days: day })}
                  className={`px-2 py-1 text-center rounded hover:bg-secondary/30 ${
                    value.mode === 'days' && value.days === day ? 'bg-secondary/30 text-primary' : ''
                  }`}
                >
                  {day} dias
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Menu>
      <MenuButton className={buttonClass} aria-label="Selecionar periodo" title="Selecionar periodo">
        {withDisplay && <h3 className={inline ? 'block' : 'hidden md:block'}>{displayText}</h3>}
        <CalendarDays size={18} />
      </MenuButton>

      <MenuItems
        anchor="bottom"
        portal={false}
        className="bg-white origin-top-right rounded-xl border border-[#E2E8F0] p-2 text-sm text-[#1A202C] shadow-lg focus:outline-none z-50 lg:mt-0 mt-2 w-[320px]"
      >
        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Selecionar intervalo</div>

        <div className="px-2 pb-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-500">Inicio</span>
              <input
                type="date"
                value={rangeDraft.start}
                onChange={(e) => setStart(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-500">Fim</span>
              <input
                type="date"
                value={rangeDraft.end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
          </div>

          {!rangeIsValid && <div className="mt-2 text-[11px] text-red-600">O inicio nao pode ser depois do fim.</div>}

          <div className="mt-3 flex items-center justify-between gap-2">
            {futureToggle}
            <MenuItem
              as="button"
              type="button"
              disabled={!rangeIsValid}
              onClick={() => onChange({ mode: 'range', start: rangeDraft.start, end: rangeDraft.end })}
              className="text-xs px-4 py-2 rounded-full bg-primary hover:bg-secondary text-white font-semibold disabled:opacity-50"
            >
              Aplicar
            </MenuItem>
          </div>


        </div>

        <div className="my-2 h-px w-full bg-gray-200" />

        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Selecionar mes especifico</div>

        <div className="px-2 pb-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-500">Mes</span>
              <select
                value={monthDraft.month}
                onChange={(e) => setMonthDraft((prev) => ({ ...prev, month: e.target.value }))}
                className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
              >
                {monthOptions.map((monthOption) => (
                  <option key={monthOption.value} value={monthOption.value}>
                    {monthOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-500">Ano</span>
              <select
                value={monthDraft.year}
                onChange={(e) => setMonthDraft((prev) => ({ ...prev, year: e.target.value }))}
                className="h-9 rounded-lg border border-[#E2E8F0] px-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
              >
                {yearOptions.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <MenuItem
              as="button"
              type="button"
              disabled={!monthIsValid}
              onClick={() => onChange({ mode: 'month', month: monthDraft.month, year: monthDraft.year })}
              className="text-xs px-4 py-2 rounded-full bg-primary hover:bg-secondary text-white font-semibold disabled:opacity-50"
            >
              Aplicar mes
            </MenuItem>
          </div>
        </div>

        <div className="my-2 h-px w-full bg-gray-200" />

        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Filtrar por periodo de</div>

        <div className="grid grid-cols-3 gap-2 px-2">
          {dayOptions.map((day) => (
            <MenuItem
              key={day}
              as="button"
              onClick={() => onChange({ mode: 'days', days: day })}
              className={`px-2 py-1 text-center rounded data-[focus]:bg-secondary/30 ${
                value.mode === 'days' && value.days === day ? 'bg-secondary/30 text-primary' : ''
              }`}
            >
              {day} dias
            </MenuItem>
          ))}
        </div>
      </MenuItems>
    </Menu>
  )
}
