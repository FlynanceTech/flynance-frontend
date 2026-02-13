import { useMemo, useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

export type DateFilter =
  | { mode: 'days'; days: number }
  | { mode: 'range'; start: string; end: string } // "YYYY-MM-DD"

const dayOptions = [7, 15, 30, 60, 90, 180]

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

  const displayText = useMemo(() => {
    if (value.mode === 'days') {
      return includeFuture ? `Proximos ${value.days} dias` : `Ultimos ${value.days} dias`
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
    return defaultRange
  })

  useEffect(() => {
    if (value.mode === 'range') setRangeDraft({ start: value.start, end: value.end })
  }, [value])

  const rangeIsValid = rangeDraft.start && rangeDraft.end && rangeDraft.start <= rangeDraft.end

  const setStart = (start: string) => {
    setRangeDraft((prev) => ({ start, end: prev.end && start > prev.end ? start : prev.end }))
  }

  const setEnd = (end: string) => {
    setRangeDraft((prev) => ({ start: prev.start && end < prev.start ? end : prev.start, end }))
  }

  const baseButtonClass = `h-9 ${withDisplay ? 'px-4 py-2' : 'w-9 p-0'} flex w-full lg:max-w-44 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 cursor-pointer`
  const buttonClass = className ? `${baseButtonClass} ${className}` : baseButtonClass

  const futureToggle = onIncludeFutureChange ? (
    <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={includeFuture}
        onChange={(e) => onIncludeFutureChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
      />
      Futuros
    </label>
  ) : null

  if (inline) {
    return (
      <div className="flex flex-col gap-2 w-full">
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

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={!rangeIsValid}
                  onClick={() => onChange({ mode: 'range', start: rangeDraft.start, end: rangeDraft.end })}
                  className="text-xs px-4 py-2 rounded-full bg-primary hover:bg-secondary text-white font-semibold disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>

              {futureToggle}
            </div>

            <div className="my-2 h-px w-full bg-gray-200" />

            <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Filtrar por periodo</div>

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

          <div className="mt-3 flex items-center justify-end gap-2">
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

          {futureToggle}
        </div>

        <div className="my-2 h-px w-full bg-gray-200" />

        <div className="mb-2 font-semibold text-xs text-gray-500 px-2">Filtrar por periodo</div>

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
