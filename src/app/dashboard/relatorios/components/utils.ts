export const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export const pct = (v: number) => `${(Number(v || 0) * 100).toFixed(1)}%`

export function monthLabel(key: string) {
  const [y, m] = key.split('-')
  if (!y || !m) return key
  const dt = new Date(Number(y), Number(m) - 1, 1)
  return dt.toLocaleDateString('pt-BR', { month: 'short' })
}

export function formatDateBR(iso?: string) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleDateString('pt-BR')
}

export function badgeForScore(score: number) {
  if (score <= 49) return { label: 'Crítico', cls: 'bg-red-100 text-red-700' }
  if (score <= 74) return { label: 'Atenção', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'Saudável', cls: 'bg-emerald-100 text-emerald-700' }
}

export function scoreColor(score: number) {
  if (score <= 49) return '#EF4444'
  if (score <= 74) return '#F59E0B'
  return '#10B981'
}

export function volatilityLabel(v: string) {
  if (v === 'low') return 'baixo'
  if (v === 'medium') return 'médio'
  if (v === 'high') return 'alto'
  return v
}
