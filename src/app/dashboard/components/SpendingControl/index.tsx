'use client'

import React, { useMemo, useState } from 'react'
import { ClipboardList, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useControls } from '@/hooks/query/useSpendingControl'
import SpendingControlDrawer from '../SpendingControlDrawer'
import { useCategories } from '@/hooks/query/useCategory'
import Link from 'next/link'

type Channel = 'IN_APP' | 'EMAIL' | 'WHATSZAPP'

interface ControlWithProgress {
  id: string
  categoryId: string | null
  goal: number
  periodType: 'monthly'
  resetDay: number | null
  includeSubcategories: boolean
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: Channel[]
  periodStart: string
  periodEnd: string
  nextResetAt: string
  spent: number
  remainingToGoal: number
  usagePctOfGoal: number
  usagePctOfLimit: number
  overLimit: boolean
}

const toBRL = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS = {
  ok: { cls: 'text-primary', Icon: CheckCircle2, label: 'OK' },
  warning: { cls: 'text-yellow-500', Icon: AlertTriangle, label: 'Atenção' },
  danger: { cls: 'text-red-600', Icon: XCircle, label: 'Estourou' },
} as const

type StatusKey = keyof typeof STATUS

function getStatus(c: ControlWithProgress): StatusKey {
  if (c.overLimit) return 'danger'
  if (c.usagePctOfGoal >= 100) return 'warning'
  return 'ok'
}

function priorityScore(c: ControlWithProgress): number {
  const base = getStatus(c) === 'danger' ? 3 : getStatus(c) === 'warning' ? 2 : 1
  return base * 1000 + c.usagePctOfGoal
}

export function SpendingControl() {
  const { controlsQuery } = useControls()
  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

  const items = useMemo(() => {
    return (controlsQuery.data ?? [])
      .sort((a, b) => priorityScore(b) - priorityScore(a))
      .slice(0, 3)
  }, [controlsQuery.data])

  const categoryNameById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const c of categories) map[c.id] = c.name
    return map
  }, [categories])

  function formatPeriod(startISO: string, endISO: string): string {
    const start = new Date(startISO)
    const end = new Date(endISO)
    const sameMonthAndYear = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()

    if (sameMonthAndYear) {
      const dayStart = start.toLocaleDateString('pt-BR', { day: '2-digit' })
      const dayEnd = end.toLocaleDateString('pt-BR', { day: '2-digit' })
      const tail = end.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      return `${dayStart}–${dayEnd} ${tail}`
    }

    return `${start.toLocaleDateString('pt-BR')} – ${end.toLocaleDateString('pt-BR')}`
  }

  function formatNextReset(nextISO: string): string {
    const d = new Date(nextISO)
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800">Controle de Metas</h2>
        <div className='flex items-center gap-4'>
          <Link href="/dashboard/controles" className='text-xs bg-secondary/30 hover:bg-secondary/35 text-primary px-4 py-2 rounded-full cursor-pointer hidden lg:block'> Meus Controles</Link>
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 bg-secondary/30 text-primary font-semibold px-2 py-2 rounded-full text-sm hover:bg-secondary/35 cursor-pointer"
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
          <div className="flex flex-col gap-4 items-center lg:items-start w-full">
            {items.map((c) => {
              const catLabel = c.categoryId ? categoryNameById[c.categoryId] ?? 'Categoria' : 'Geral'
              const status = getStatus(c)
              const { Icon, cls, label } = STATUS[status]
              const pct = Math.min(c.usagePctOfGoal, 100)

              const barColor =
                c.usagePctOfGoal <= 60
                  ? 'bg-blue-500'
                  : c.usagePctOfGoal <= 80
                  ? 'bg-yellow-400'
                  : 'bg-red-500'

              return (
                <Link href={`/dashboard/controles/${c.id}`} key={c.id} className="w-full relative space-y-1 border border-gray-100 rounded-lg p-2 hover:shadow-sm transition-all">
                  {c.usagePctOfGoal >= 80 && (
                    <span
                      className={`absolute top-7 right-1 z-30 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                      ${status === 'danger' ? 'bg-red-600 text-white'
                        : status === 'warning' ? 'bg-yellow-400 text-black'
                        : 'bg-blue-500 text-white'}`}
                    >
                      {Math.round(c.usagePctOfGoal)}%
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cls}`} aria-hidden />
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                      {catLabel} <span className="text-xs text-gray-500">({label})</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      Meta {toBRL(c.goal)}
                    </span>
                  </div>

                  <div
                    className="w-full h-4 overflow-hidden relative"
                    title={`Gasto: ${toBRL(c.spent)} (${Math.round(pct)}%)`}
                  >
                    {/* Fundo cinza */}
                    <div className="h-2 absolute top-[3px] bg-gray-200 w-full rounded-full" />
                    {/* Barra colorida dinâmica */}
                    <div
                      className={`h-2 absolute top-[3px] z-10 ${barColor} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                    {/* Marcador visual (notifyAtPct[0]) */}
                    <div
                      className="absolute top-0 z-20 h-[16px] w-[4px] bg-gray-700 rounded-full"
                      style={{
                        left: `${Math.min(Math.max(c.notifyAtPct?.[0] ?? 80, 0), 100)}%`,
                        transform: 'translateX(-1px)',
                      }}
                      title={`Notificar a partir de ${c.notifyAtPct?.[0] ?? 80}%`}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Período: {formatPeriod(c.periodStart, c.periodEnd)}</span>
                    <span>Reinicia: {formatNextReset(c.nextResetAt)}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span>Gasto: {toBRL(c.spent)}</span>
                    <span className={c.spent > c.goal ? 'text-red-600' : 'text-emerald-700'}>
                      {c.spent > c.goal
                        ? `Excedeu ${toBRL(c.spent - c.goal)}`
                        : `Restante: ${toBRL(c.goal - c.spent)}`}
                    </span>
                  </div>
                </Link>
              )
            })}

            <Link href="/dashboard/controles" className='text-xs bg-secondary/30 hover:bg-secondary/35 text-primary px-4 py-2 rounded-full cursor-pointer lg:hidden max-w-40 flex justify-center'> Meus Controles</Link>
          </div>
        )}
      </div>

      <SpendingControlDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

export default SpendingControl
