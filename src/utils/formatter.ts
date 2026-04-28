import { useUserPreferencesStore } from '@/stores/useUserPreferences'

const DEFAULT_LOCALE = 'pt-BR'
const DEFAULT_CURRENCY = 'BRL'

function resolveLocaleCurrency() {
  const preferences = useUserPreferencesStore.getState().preferences
  const locale = String(preferences?.locale ?? DEFAULT_LOCALE).trim() || DEFAULT_LOCALE
  const currency = String(preferences?.currency ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY
  return { locale, currency }
}

export function formatCurrency(value: number, options?: { locale?: string; currency?: string }) {
  const resolved = resolveLocaleCurrency()
  const locale = options?.locale || resolved.locale
  const currency = (options?.currency || resolved.currency).toUpperCase()
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(safeValue)
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
    }).format(safeValue)
  }
}

export const formatter = (value: number) => formatCurrency(value)

export function getLocalISOString(date = new Date()) {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

export function toUTCISOString(input: string | Date) {
  const date = typeof input === 'string' ? new Date(input) : input

  if (Number.isNaN(date.getTime())) {
    throw new Error('Data invalida')
  }

  return date.toISOString()
}

export function isoZToDatetimeLocal(isoZ: string) {
  const date = new Date(isoZ)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')

  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}
