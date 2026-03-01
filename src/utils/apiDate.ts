const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/
const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function assertValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || month > 12 || day < 1 || day > 31) return false

  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day
  )
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function parseBrDate(value: string): Date {
  const raw = String(value ?? '').trim()
  const match = raw.match(BR_DATE_RE)
  if (!match) {
    throw new Error('Data invalida. Use o formato dd/MM/yyyy.')
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (!assertValidDateParts(year, month, day)) {
    throw new Error('Data invalida.')
  }

  return new Date(year, month - 1, day)
}

export function toApiDate(inputDate: string | Date): string {
  if (inputDate instanceof Date) {
    if (Number.isNaN(inputDate.getTime())) {
      throw new Error('Data invalida.')
    }
    return formatLocalDate(inputDate)
  }

  const raw = String(inputDate ?? '').trim()
  if (!raw) {
    throw new Error('Data invalida.')
  }

  if (BR_DATE_RE.test(raw)) {
    throw new Error('Formato de data invalido para API. Use YYYY-MM-DD.')
  }

  const isoMatch = raw.match(ISO_DATE_RE)
  if (!isoMatch) {
    throw new Error('Formato de data invalido para API. Use YYYY-MM-DD.')
  }

  const year = Number(isoMatch[1])
  const month = Number(isoMatch[2])
  const day = Number(isoMatch[3])
  if (!assertValidDateParts(year, month, day)) {
    throw new Error('Data invalida.')
  }

  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function tryToApiDate(inputDate: string | Date): string | null {
  try {
    return toApiDate(inputDate)
  } catch {
    return null
  }
}
