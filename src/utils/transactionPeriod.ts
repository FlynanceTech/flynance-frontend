type TransactionFilterMode = 'days' | 'month' | 'range'

export type ResolveTransactionPeriodInput = {
  mode: TransactionFilterMode
  days?: number
  includeFuture?: boolean
  month?: string
  year?: string
  rangeStart?: string
  rangeEnd?: string
  timezone?: string
  now?: Date
}

export type ResolvedTransactionPeriod = {
  dateFrom: string
  dateTo: string
  timezone: string
  includeFutureDays: number
  startDate: Date
  endDate: Date
  label: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

function parseIsoDate(value?: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0)
}

function endOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999)
}

function displayDate(value: Date): string {
  return value.toLocaleDateString('pt-BR')
}

export function getBrowserTimezone(): string {
  if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) return 'UTC'
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function resolveRangeMode(input: ResolveTransactionPeriodInput): { start: Date; end: Date } | null {
  const start = parseIsoDate(input.rangeStart)
  const end = parseIsoDate(input.rangeEnd)
  if (!start || !end) return null
  if (start.getTime() > end.getTime()) return null
  return { start: startOfDay(start), end: endOfDay(end) }
}

function resolveMonthMode(input: ResolveTransactionPeriodInput): { start: Date; end: Date } | null {
  const month = Number(input.month)
  const year = Number(input.year)
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(year) || year < 1) return null

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end }
}

function resolveDaysMode(input: ResolveTransactionPeriodInput): {
  start: Date
  end: Date
  includeFutureDays: number
} {
  const safeDays = Math.max(1, Number(input.days || 30))
  const baseDate = input.now ?? new Date()
  const today = startOfDay(baseDate)

  if (input.includeFuture) {
    const start = today
    const end = new Date(today.getTime() + (safeDays - 1) * DAY_MS)
    return { start, end: endOfDay(end), includeFutureDays: Math.max(0, safeDays - 1) }
  }

  const start = new Date(today.getTime() - (safeDays - 1) * DAY_MS)
  return { start, end: endOfDay(today), includeFutureDays: 0 }
}

export function resolveTransactionPeriod(input: ResolveTransactionPeriodInput): ResolvedTransactionPeriod {
  const timezone = input.timezone || getBrowserTimezone()

  const fromRange = input.mode === 'range' ? resolveRangeMode(input) : null
  if (fromRange) {
    return {
      dateFrom: fromRange.start.toISOString(),
      dateTo: fromRange.end.toISOString(),
      timezone,
      includeFutureDays: 0,
      startDate: fromRange.start,
      endDate: fromRange.end,
      label: `${displayDate(fromRange.start)} - ${displayDate(fromRange.end)}`,
    }
  }

  const fromMonth = input.mode === 'month' ? resolveMonthMode(input) : null
  if (fromMonth) {
    return {
      dateFrom: fromMonth.start.toISOString(),
      dateTo: fromMonth.end.toISOString(),
      timezone,
      includeFutureDays: 0,
      startDate: fromMonth.start,
      endDate: fromMonth.end,
      label: `${displayDate(fromMonth.start)} - ${displayDate(fromMonth.end)}`,
    }
  }

  const fromDays = resolveDaysMode(input)
  return {
    dateFrom: fromDays.start.toISOString(),
    dateTo: fromDays.end.toISOString(),
    timezone,
    includeFutureDays: fromDays.includeFutureDays,
    startDate: fromDays.start,
    endDate: fromDays.end,
    label: `${displayDate(fromDays.start)} - ${displayDate(fromDays.end)}`,
  }
}

export function toMonthYearFromDate(date: Date): { month: string; year: string } {
  return {
    month: pad2(date.getMonth() + 1),
    year: String(date.getFullYear()),
  }
}

export function toRangeFromDays(days: number, now = new Date()): { start: string; end: string } {
  const safeDays = Math.max(1, days)
  const end = startOfDay(now)
  const start = new Date(end.getTime() - (safeDays - 1) * DAY_MS)
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  }
}

export function toFutureRangeFromDays(days: number, now = new Date()): { start: string; end: string } {
  const safeDays = Math.max(1, days)
  const start = startOfDay(now)
  const end = new Date(start.getTime() + (safeDays - 1) * DAY_MS)
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  }
}
