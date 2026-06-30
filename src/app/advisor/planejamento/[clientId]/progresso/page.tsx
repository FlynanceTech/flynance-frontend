'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, ShieldAlert, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import AdvisorGuard from '@/app/advisor/components/AdvisorGuard'
import { getBudgetProgress, BudgetProgressResponse, CategoryProgressItem, ClassProgressItem } from '@/services/advisorBudget'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  exceeded: 'bg-red-600',
  'no-limit': 'bg-slate-300',
}

const STATUS_BADGE: Record<string, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-600',
  exceeded: 'border-red-300 bg-red-100 text-red-700',
  'no-limit': 'border-slate-200 bg-slate-50 text-slate-500',
}

const STATUS_LABEL: Record<string, string> = {
  ok: 'Dentro do limite',
  warning: 'Atenção',
  danger: 'Próximo do limite',
  exceeded: 'Excedido',
  'no-limit': 'Sem limite',
}

const CLASS_LABELS: Record<string, string> = {
  NEUTRAL: 'Neutro',
  ESSENTIAL_EXPENSE: 'Despesa Essencial',
  NON_ESSENTIAL_EXPENSE: 'Não Essencial',
  INCOME: 'Receita',
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Category Progress Bar ────────────────────────────────────────────────────

function CategoryProgressRow({ item }: { item: CategoryProgressItem }) {
  const pct = Math.min(item.pct ?? 0, 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
            style={{ backgroundColor: `${item.categoryColor}22`, color: item.categoryColor }}
          >
            {item.categoryIcon?.slice(0, 2) ?? '◆'}
          </span>
          <span className="truncate font-medium text-[#253140]">{item.categoryName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-500">{formatCurrency(item.spent)}</span>
          {item.nominalLimit && (
            <span className="text-xs text-slate-400">/ {formatCurrency(item.nominalLimit)}</span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[item.status]}`}>
            {item.pct != null ? `${item.pct}%` : STATUS_LABEL[item.status]}
          </span>
        </div>
      </div>
      {item.nominalLimit != null && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${STATUS_COLOR[item.status]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Class Progress Card ──────────────────────────────────────────────────────

function ClassProgressCard({ item, categories }: { item: ClassProgressItem; categories: CategoryProgressItem[] }) {
  const classCats = categories.filter((c) => c.classification === item.class)
  const pct = Math.min(item.pct ?? 0, 100)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{CLASS_LABELS[item.class] ?? item.class}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold text-[#253140]">{formatCurrency(item.spent)}</span>
            {item.limit && <span className="text-sm text-slate-400">/ {formatCurrency(item.limit)}</span>}
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_BADGE[item.status]}`}>
          {item.pct != null ? `${item.pct}%` : STATUS_LABEL[item.status]}
        </span>
      </div>

      {item.limit != null && (
        <div className="px-5 pt-3">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${STATUS_COLOR[item.status]}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {classCats.length > 0 && (
        <div className="space-y-3 px-5 py-4">
          {classCats.map((c) => <CategoryProgressRow key={c.categoryId} item={c} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressoPage() {
  return (
    <AdvisorGuard>
      <Suspense fallback={<ProgressoFallback />}>
        <ProgressoInner />
      </Suspense>
    </AdvisorGuard>
  )
}

function ProgressoFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )
}

function ProgressoInner() {
  const router = useRouter()
  const params = useParams<{ clientId: string }>()
  const searchParams = useSearchParams()
  const clientId = String(params?.clientId ?? '').trim()
  const clientName = searchParams.get('name') ?? 'Cliente'

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BudgetProgressResponse | null>(null)

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await getBudgetProgress(clientId)
      setData(res)
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar progresso.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const critical = data?.categoryProgress.filter((c) => c.status === 'exceeded' || c.status === 'danger') ?? []

  return (
    <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:pb-8 lg:pt-8">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/advisor/planejamento/${clientId}?name=${encodeURIComponent(clientName)}`)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase text-[#2F6E91]">Acompanhar Progresso</p>
            <h1 className="text-xl font-semibold text-[#253140]">{clientName}</h1>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {data?.monthYear ?? ''}
        </span>
      </div>

      {/* Overall KPIs */}
      {data && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Receita do mês', value: formatCurrency(data.monthlyIncome), sub: null },
            { label: 'Total gasto', value: formatCurrency(data.totalSpent), sub: data.totalBudget ? `de ${formatCurrency(data.totalBudget)}` : null },
            { label: 'Uso do orçamento', value: data.overallPct != null ? `${data.overallPct}%` : '—', sub: null, status: data.overallStatus },
          ].map(({ label, value, sub, status }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className={['mt-2 text-2xl font-bold', status === 'exceeded' ? 'text-red-600' : status === 'danger' ? 'text-red-500' : status === 'warning' ? 'text-amber-600' : 'text-[#253140]'].join(' ')}>
                {value}
              </p>
              {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Critical alerts */}
      {critical.length > 0 && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <ShieldAlert className="h-4 w-4" />
            {critical.length} {critical.length === 1 ? 'categoria crítica' : 'categorias críticas'}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {critical.map((c) => (
              <span key={c.categoryId} className="rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {c.categoryName} ({c.pct}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Class progress */}
      {data && data.classProgress.length > 0 ? (
        <div className="space-y-4">
          {data.classProgress.map((cls) => (
            <ClassProgressCard
              key={cls.class}
              item={cls}
              categories={data.categoryProgress.filter((c) => c.classification === cls.class)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">Nenhum limite definido ainda</p>
          <p className="mt-1 text-xs text-slate-400">
            Defina limites no planejamento para acompanhar o progresso.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/advisor/planejamento/${clientId}?name=${encodeURIComponent(clientName)}`)}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0]"
          >
            Ir ao planejamento
          </button>
        </div>
      )}
    </section>
  )
}
