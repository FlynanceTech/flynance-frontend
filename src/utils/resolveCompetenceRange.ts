import {
  defaultUserCyclePreferences,
  type AutonomousCycleKind,
  type UserCyclePreferences,
} from './cyclePreferences'

export type CompetenceRange = {
  periodStart: string
  periodEnd: string
  label: string
}

const COMPETENCE_TIMEZONE = 'America/Sao_Paulo'
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: COMPETENCE_TIMEZONE,
})
const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: COMPETENCE_TIMEZONE,
})

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function createUTCDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0))
}

function toISODate(value: Date) {
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`
}

function toDayMonthLabel(value: Date) {
  return DAY_MONTH_FORMATTER.format(value)
}

function toCompetenceMonthLabel(year: number, monthIndex: number) {
  const date = createUTCDate(year, monthIndex, 1)
  const monthShort = MONTH_SHORT_FORMATTER.format(date).replace('.', '')
  return `${monthShort.charAt(0).toUpperCase()}${monthShort.slice(1)}/${date.getUTCFullYear()}`
}

function parseMonthKey(monthKey?: string | null) {
  const raw = String(monthKey ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})$/)
  if (!matched) return null

  const year = Number(matched[1])
  const monthIndex = Number(matched[2]) - 1
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return null
  if (monthIndex < 0 || monthIndex > 11) return null

  return { year, monthIndex }
}

function resolveBaseMonth(monthKey?: string | null) {
  const parsed = parseMonthKey(monthKey)
  if (parsed) return parsed

  const now = new Date()
  return {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  }
}

function clampDay(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(31, Math.max(1, Math.trunc(value)))
}

function resolveSafeDay(day?: number | null) {
  return clampDay(Number(day ?? 1))
}

function dateWithClampedDay(year: number, monthIndex: number, day: number) {
  const monthDate = createUTCDate(year, monthIndex, 1)
  const lastDay = createUTCDate(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0).getUTCDate()
  const clampedDay = Math.min(lastDay, clampDay(day))
  return createUTCDate(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), clampedDay)
}

function endOfMonth(year: number, monthIndex: number) {
  const monthDate = createUTCDate(year, monthIndex, 1)
  return createUTCDate(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)
}

function addDays(value: Date, days: number) {
  return createUTCDate(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days)
}

function resolveAutonomousKind(preferences: UserCyclePreferences): AutonomousCycleKind {
  return preferences.autonomousCycleKind ?? 'calendar_month'
}

export function resolveCompetenceRange(
  selectedMonthKey: string,
  preferences?: UserCyclePreferences | null
): CompetenceRange {
  const { year, monthIndex } = resolveBaseMonth(selectedMonthKey)
  const safePreferences = preferences ?? defaultUserCyclePreferences()
  let periodStart: Date
  let periodEnd: Date

  if (safePreferences.cycleMode === 'fixed_payday') {
    const paydayDay = resolveSafeDay(safePreferences.paydayDay)
    const currentPayday = dateWithClampedDay(year, monthIndex, paydayDay)
    periodStart = dateWithClampedDay(year, monthIndex - 1, paydayDay)
    periodEnd = addDays(currentPayday, -1)
  } else {
    const autonomousKind = resolveAutonomousKind(safePreferences)
    if (autonomousKind === 'cutoff_day') {
      const closingDay = resolveSafeDay(safePreferences.cutoffDay)
      if (closingDay === 1) {
        periodStart = dateWithClampedDay(year, monthIndex, 1)
        periodEnd = endOfMonth(year, monthIndex)
      } else {
        periodEnd = dateWithClampedDay(year, monthIndex, closingDay)
        const previousClosing = dateWithClampedDay(year, monthIndex - 1, closingDay)
        periodStart = addDays(previousClosing, 1)
      }
    } else {
      periodStart = dateWithClampedDay(year, monthIndex, 1)
      periodEnd = endOfMonth(year, monthIndex)
    }
  }

  const monthLabel = toCompetenceMonthLabel(year, monthIndex)
  const rangeLabel = `${toDayMonthLabel(periodStart)} a ${toDayMonthLabel(periodEnd)}`

  return {
    periodStart: toISODate(periodStart),
    periodEnd: toISODate(periodEnd),
    label: `${monthLabel} (${rangeLabel})`,
  }
}
