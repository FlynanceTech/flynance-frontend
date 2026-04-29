import { tryToApiDate } from './apiDate'

const ISO_DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})/

export const FIXED_ACCOUNT_TIME_ZONE = 'America/Sao_Paulo'

type DateParts = {
  year: number
  month: number
  day: number
}

function parseISODatePrefix(raw: string): DateParts | null {
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
  return { year, month, day }
}

export function toISODateOnlyFromDatePicker(
  value: string | Date,
  timeZone = FIXED_ACCOUNT_TIME_ZONE
): string | null {
  // Mantem assinatura com timezone por compatibilidade do fluxo atual.
  // O parse canônico é centralizado em toApiDate/tryToApiDate.
  void timeZone
  return tryToApiDate(value)
}

export function getDueDayFromStartDate(startDateISO: string): number | null {
  const parsed = parseISODatePrefix(String(startDateISO ?? '').trim())
  if (!parsed) return null
  return parsed.day
}

export function isDueDayMatchingStartDate(startDateISO: string, dueDay: number): boolean {
  const parsedDueDay = getDueDayFromStartDate(startDateISO)
  return Number.isFinite(parsedDueDay) && parsedDueDay === dueDay
}

export type FixedAccountEditPayloadInput = {
  name: string
  amount: number
  categoryId?: string | null
  notes?: string | null
  startDateInput: string | Date
  dueDateInput?: string | Date | null
}

export type FixedAccountEditPayload = {
  name: string
  amount: number
  categoryId?: string
  notes?: string
  startDate: string
  dueDay: number
  dueDate?: string
}

export function buildFixedAccountEditPayload(
  input: FixedAccountEditPayloadInput
): FixedAccountEditPayload | null {
  const trimmedName = String(input.name ?? '').trim()
  if (!trimmedName) return null
  if (!Number.isFinite(input.amount) || input.amount <= 0) return null

  const startDate = toISODateOnlyFromDatePicker(input.startDateInput)
  if (!startDate) return null

  const dueDate = input.dueDateInput
    ? toISODateOnlyFromDatePicker(input.dueDateInput) ?? undefined
    : undefined
  if (input.dueDateInput && !dueDate) return null

  const dueDateReference = dueDate ?? startDate
  const dueDay = getDueDayFromStartDate(dueDateReference)
  if (!dueDay || dueDay < 1 || dueDay > 31) return null
  if (!isDueDayMatchingStartDate(dueDateReference, dueDay)) return null

  const categoryId = String(input.categoryId ?? '').trim() || undefined
  const notes = String(input.notes ?? '').trim() || undefined

  return {
    name: trimmedName,
    amount: input.amount,
    startDate,
    dueDay,
    dueDate,
    categoryId,
    notes,
  }
}
