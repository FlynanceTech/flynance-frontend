export type FixedAccountCurrentCycleStatus = 'PAID' | 'PENDING' | 'OVERDUE' | string | null | undefined
export type FixedAccountFilterKey = 'all' | 'paid' | 'pending'
const ISO_DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})/
const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function normalizeISODateOnly(value?: string | null) {
  const raw = String(value ?? '').trim()
  const match = raw.match(ISO_DATE_PREFIX_RE)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return `${year}-${pad2(month)}-${pad2(day)}`
}

function normalizeMonthKey(value?: string | null) {
  const raw = String(value ?? '').trim()
  const match = raw.match(MONTH_KEY_RE)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null

  return `${year}-${pad2(month)}`
}

function todayISODateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) return null

  return normalizeISODateOnly(`${year}-${month}-${day}`)
}

export function isPaidCurrentCycle(status: FixedAccountCurrentCycleStatus) {
  return status === 'PAID'
}

export function isPendingCurrentCycle(status: FixedAccountCurrentCycleStatus) {
  return status === 'PENDING' || status === 'OVERDUE'
}

export function isOverdueCurrentCycle(status: FixedAccountCurrentCycleStatus) {
  return status === 'OVERDUE'
}

type CyclePaymentLike = {
  id?: string | null
  periodKey?: string | null
  dueDate?: string | null
  paidAt?: string | null
}

function isISODateInRange(
  dateISO: string | null,
  periodStart: string,
  periodEnd: string
) {
  if (!dateISO) return false
  const start = normalizeISODateOnly(periodStart)
  const end = normalizeISODateOnly(periodEnd)
  if (!start || !end) return false
  return dateISO >= start && dateISO <= end
}

function paymentBelongsToCompetence(
  payment: CyclePaymentLike | null | undefined,
  periodStart: string,
  periodEnd: string,
  selectedMonthKey?: string
) {
  if (!payment) return false

  const normalizedSelectedMonth = normalizeMonthKey(selectedMonthKey)
  const normalizedPaymentPeriodKey = normalizeMonthKey(payment.periodKey)
  if (normalizedSelectedMonth && normalizedPaymentPeriodKey) {
    return normalizedSelectedMonth === normalizedPaymentPeriodKey
  }

  const dueDate = normalizeISODateOnly(payment.dueDate)
  if (isISODateInRange(dueDate, periodStart, periodEnd)) return true

  const paidAt = normalizeISODateOnly(payment.paidAt)
  if (isISODateInRange(paidAt, periodStart, periodEnd)) return true

  return false
}

type IsPaidInCompetenceInput = {
  status: FixedAccountCurrentCycleStatus
  selectedMonthKey?: string
  periodStart: string
  periodEnd: string
  paymentCurrentCycle?: CyclePaymentLike | null
  payment?: CyclePaymentLike | null
}

export function isPaidInCompetence(input: IsPaidInCompetenceInput) {
  if (
    paymentBelongsToCompetence(
      input.paymentCurrentCycle,
      input.periodStart,
      input.periodEnd,
      input.selectedMonthKey
    )
  ) {
    return true
  }

  if (!isPaidCurrentCycle(input.status)) return false

  return paymentBelongsToCompetence(
    input.payment,
    input.periodStart,
    input.periodEnd,
    input.selectedMonthKey
  )
}

type ShouldDisplayOverdueTagInput = {
  status: FixedAccountCurrentCycleStatus
  dueDate?: string | null
  isPaid?: boolean
  todayISODate?: string
  timeZone?: string
}

export function shouldDisplayOverdueTag(input: ShouldDisplayOverdueTagInput) {
  if (input.isPaid) return false
  if (!isOverdueCurrentCycle(input.status)) return false

  const dueDate = normalizeISODateOnly(input.dueDate)
  if (!dueDate) return false

  const normalizedToday = normalizeISODateOnly(input.todayISODate)
  const today =
    normalizedToday ||
    todayISODateInTimeZone(input.timeZone?.trim() || 'America/Sao_Paulo')
  if (!today) return false

  return dueDate < today
}

export function matchesCurrentCycleFilter(
  status: FixedAccountCurrentCycleStatus,
  filter: FixedAccountFilterKey
) {
  if (filter === 'paid') return isPaidCurrentCycle(status)
  if (filter === 'pending') return isPendingCurrentCycle(status)
  return true
}

export function currentCycleStatusLabel(status: FixedAccountCurrentCycleStatus) {
  if (status === 'PAID') return 'Paga'
  if (status === 'OVERDUE') return 'Atrasada'
  if (status === 'PENDING') return 'Pendente'
  return 'Pendente'
}
