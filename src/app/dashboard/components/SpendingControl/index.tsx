'use client'

import React, { useMemo, useState } from 'react'
import { ClipboardList, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useControls } from '@/hooks/query/useSpendingControl'
import SpendingControlDrawer from '../SpendingControlDrawer'
import { useCategories } from '@/hooks/query/useCategory'

// ---- Tipos (alinhados à rota /controls?withProgress=true) ----
type PeriodType = 'weekly' | 'monthly'
type Channel = 'IN_APP' | 'EMAIL'

type ControlBase = {
  id: string
  categoryId: string | null
  goal: number
  limit: number
  periodType: PeriodType
  resetDay: number | null
  resetWeekday: number | null
  includeSubcategories: boolean
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: Channel[]
}

type ControlWithProgress = ControlBase & {
  periodStart: string
  periodEnd: string
  nextResetAt: string
  spent: number
  remainingToGoal: number
  remainingToLimit: number
  usagePctOfGoal: number
  usagePctOfLimit: number
  overLimit: boolean
}

function isWithProgress(x: unknown): x is ControlWithProgress {
  return typeof x === 'object' && x !== null && 'spent' in x && 'usagePctOfLimit' in x
}

const toBRL = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS = {
  ok: { cls: 'text-emerald-600', Icon: CheckCircle2, label: 'OK' },
  warning: { cls: 'text-yellow-500', Icon: AlertTriangle, label: 'Atenção' },
  danger: { cls: 'text-red-600', Icon: XCircle, label: 'Estourou' },
} as const
type StatusKey = keyof typeof STATUS

function getStatus(c: ControlWithProgress): StatusKey {
  if (c.overLimit || (c.limit > 0 && c.spent >= c.limit)) return 'danger'
  if (c.usagePctOfLimit >= 75) return 'warning'
  return 'ok'
}

/** score de risco: maior primeiro (danger > warning > ok; empate por % de limite) */
function riskScore(c: ControlWithProgress): number {
  const base = getStatus(c) === 'danger' ? 3 : getStatus(c) === 'warning' ? 2 : 1
  return base * 1000 + c.usagePctOfLimit // empurra por % usado
}

interface Props {
  userId?: string
}

export function SpendingControl({}: Props) {

  const router = useRouter()

  const { controlsQuery } = useControls()
  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

  const items = useMemo<ControlWithProgress[]>(() => {
    const data = controlsQuery.data ?? []
    const withProgress = (Array.isArray(data) ? data : []).filter(isWithProgress)

    return withProgress.sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 4)
  }, [controlsQuery.data])

  const categoryNameById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const c of categories) map[c.id] = c.name
    return map
  }, [categories])

  function formatPeriod(startISO: string, endISO: string): string {
    const start = new Date(startISO)
    const end = new Date(endISO)
  
    const sameMonthAndYear =
      start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
  
    if (sameMonthAndYear) {
      // Ex.: 01–31 ago 2025
      const dayStart = start.toLocaleDateString('pt-BR', { day: '2-digit' })
      const dayEnd = end.toLocaleDateString('pt-BR', { day: '2-digit' })
      const tail = end.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      return `${dayStart}–${dayEnd} ${tail}`
    }
  
    // Ex.: 25/07/2025 – 31/08/2025
    const s = start.toLocaleDateString('pt-BR')
    const e = end.toLocaleDateString('pt-BR')
    return `${s} – ${e}`
  }

  function formatNextReset(nextISO: string): string {
    const d = new Date(nextISO)
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  function priorityScore(c: {
    overLimit: boolean;
    usagePctOfLimit: number;
    usagePctOfGoal: number;  
  }) {
    if (c.overLimit) return 10_000;
    
    return c.usagePctOfLimit * 1.5 + c.usagePctOfGoal * 1.0;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800">Controle de Gastos</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 font-semibold px-2 py-2 rounded-full text-sm hover:bg-emerald-200"
            aria-label="Adicionar controle"
            title="Novo controle"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {controlsQuery.isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-sm text-gray-500 text-center py-8">
            <ClipboardList className="w-6 h-6 mb-2 text-gray-400" />
            Nenhum controle de gasto cadastrado ainda. <br />
            Clique em <strong>Novo controle</strong> para criar o primeiro!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items
             .sort((a, b) => priorityScore(b) - priorityScore(a))
             .slice(0, 3).map((c) => {
              const catLabel = c.categoryId ? categoryNameById[c.categoryId] ?? 'Categoria' : 'Geral'
              const status = getStatus(c)
              const { Icon, cls, label } = STATUS[status]

              // porcentagens para a barra
              const pctLimit = c.limit > 0 ? Math.min((c.spent / c.limit) * 100, 100) : 0
              const pctMetaMarker = c.limit > 0 ? Math.min((c.goal / c.limit) * 100, 100) : 0

              const colorBar =
                status === 'danger'
                  ? 'bg-red-500'
                  : c.usagePctOfLimit >= 75
                  ? 'bg-emerald-600'
                  : c.usagePctOfLimit >= 50
                  ? 'bg-yellow-400'
                  : 'bg-emerald-400'

              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cls}`} aria-hidden />
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                      {catLabel} <span className="text-xs text-gray-500">({label})</span>
                    </span>
                    <span className="text-xs text-gray-500" title={`Limite: ${toBRL(c.limit)}`}>
                      Limite {toBRL(c.limit)}
                    </span>
                  </div>

                  <div className="w-full h-4 overflow-hidden relative" title={`Gasto: ${toBRL(c.spent)} (${Math.round(c.usagePctOfLimit)}% do limite)`}>
                    {/* trilho */}
                    <div className="h-2 absolute top-[3px] bg-gray-200 w-full rounded-full" />
                    {/* progresso (gasto) */}
                    <div className={`h-2 absolute top-[3px] z-10 ${colorBar} rounded-full`} style={{ width: `${pctLimit}%` }} />
                    {/* marcador da meta */}
                    <div
                      className="absolute top-0 z-20 h-[16px] w-[4px] bg-gray-700 rounded-full"
                      style={{ left: `${pctMetaMarker}%` }}
                      title={`Meta: ${toBRL(c.goal)}`}
                    />
                  </div>

                  <div className="flex flex-col text-xs text-gray-600 gap-1">
                    <div className='flex justify-between items-center'>
                      <span className="text-xs text-gray-500">
                        Período: {formatPeriod(c.periodStart, c.periodEnd)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Reinicia: {formatNextReset(c.nextResetAt)}
                      </span>
                    </div>

                    <div className="flex flex-row  justify-between">
                      <span>
                        Mês: {toBRL(c.spent)} ({Math.round(c.usagePctOfLimit)}%)
                      </span>
                      <span className={c.spent > c.goal ? 'text-red-600' : 'text-emerald-700'}>
                        Meta: {toBRL(c.goal)}
                      </span>
                      <span className={`${c.spent > c.goal ? 'text-red-600' : 'text-emerald-700'} xs:text-[10px] md:ml-1`}>
                        {c.spent > c.goal
                          ? `Excedeu ${toBRL(c.spent - c.goal)}`
                          : `Restante: ${toBRL(Math.max(0, c.goal - c.spent))}`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              onClick={() => router.push('/dashboard/controles')}
              className="text-sm text-emerald-700 hover:text-emerald-800 cursor-pointer w-full mt-2"
            >
              Ver todos os controles
            </button>
          </div>
        )}
      </div>

      {/* Drawer de cadastro */}
      <SpendingControlDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

export default SpendingControl
