import { formatCurrency } from '@/utils/formatter'

export const brl = (v: number) => formatCurrency(v || 0)

export const pct = (v: number) => `${(Number(v || 0) * 100).toFixed(1)}%`

export function monthLabel(key: string, locale: string) {
  const [y, m] = key.split('-')
  if (!y || !m) return key
  const dt = new Date(Number(y), Number(m) - 1, 1)
  return dt.toLocaleDateString(locale, { month: 'short' })
}

export function formatDateByLocale(iso?: string, locale = 'pt-BR') {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleDateString(locale)
}

export type ScoreLevel = 'critical' | 'attention' | 'healthy'

export function badgeForScore(score: number) {
  if (score <= 49) return { level: 'critical' as ScoreLevel, cls: 'bg-red-100 text-red-700' }
  if (score <= 74) return { level: 'attention' as ScoreLevel, cls: 'bg-amber-100 text-amber-700' }
  return { level: 'healthy' as ScoreLevel, cls: 'bg-emerald-100 text-emerald-700' }
}

export function scoreColor(score: number) {
  if (score <= 49) return '#EF4444'
  if (score <= 74) return '#F59E0B'
  return '#10B981'
}

export function volatilityKey(v: string) {
  if (v === 'low') return 'low'
  if (v === 'medium') return 'medium'
  if (v === 'high') return 'high'
  return v
}
