'use client'

import { useState, useEffect } from 'react'
import { Check, Pencil, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import { useControls } from '@/hooks/query/useSpendingControl'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { useSpendingControlStore } from '@/stores/useSpendingControlStore'
import SpendingControlDrawer from '../components/SpendingControlDrawer'
import { MetaSlider } from '../components/MetaSlider'

type ControlWithProgress = {
  id: string
  categoryId: string | null
  goal: number
  limit: number
  periodType: 'weekly' | 'monthly'
  resetDay: number | null
  resetWeekday: number | null
  includeSubcategories: boolean
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: Array<'IN_APP' | 'EMAIL'>
  periodStart: string
  periodEnd: string
  nextResetAt: string
  spent: number
  remainingToGoal: number
  remainingToLimit: number
  usagePctOfGoal: number
  usagePctOfLimit: number
  overLimit: boolean
  status?: 'ok' | 'warning' | 'danger'
}

const toBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function formatPeriod(startISO: string, endISO: string) {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const wk = end.toLocaleDateString('pt-BR', { weekday: 'short' })
  return `Período: ${fmt(start)} – ${fmt(end)} · Reinicia: ${wk}`
}

function daysDiff(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function statusFrom(control: ControlWithProgress): { label: string; tone: 'ok' | 'warning' | 'danger'; badge: string } {
  if (control.overLimit || control.usagePctOfLimit >= 100) {
    return { label: 'Ultrapassou o limite', tone: 'danger', badge: '🔴' }
  }
  if (control.usagePctOfLimit >= 80) {
    return { label: 'Próximo do limite', tone: 'warning', badge: '🟡' }
  }
  return { label: 'Dentro da meta', tone: 'ok', badge: '🟢' }
}

export default function SpendingControlPage() {
  const { controlsQuery, updateMutation, deleteMutation } = useControls()
  const categoryStore = useCategoryStore((s) => s.categoryStore)

  // store local só para edição inline do slider
  const { addControl, controls, removeControl, updateControl, resetControls } =
    useSpendingControlStore()

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

  // carrega store local a partir do backend (para o slider)
  useEffect(() => {
    if (controlsQuery.data) {
      resetControls()
      ;(controlsQuery.data as ControlWithProgress[]).forEach((c) =>
        addControl({
          id: c.id,
          categoryId: c.categoryId ?? '',
          meta: c.goal,
          limite: c.limit,
          periodType: 'monthly',
          alert: false,
        }),
      )
    }
  }, [controlsQuery.data, addControl, resetControls])

  // ordena por proximidade do limite (desc)
  const sortedControls: ControlWithProgress[] = Array.isArray(controlsQuery.data)
    ? [...(controlsQuery.data as ControlWithProgress[])].sort(
        (a, b) => b.usagePctOfLimit - a.usagePctOfLimit,
      )
    : []

  // encontra o índice do item no store local (para o slider/edição)
  const idxLocalFor = (id: string): number =>
    controls.findIndex((x) => x.id === id)

  const handleEditToggle = (id: string) => {
    const i = idxLocalFor(id)
    if (i < 0) return
    setEditingIndex((prev) => (prev === i ? null : i))
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      const i = idxLocalFor(id)
      if (i >= 0) removeControl(controls[i].categoryId)
      toast.success('Controle removido')
    } catch {
      toast.error('Erro ao remover controle')
    }
  }

  const handleSliderChange = (id: string, value: number) => {
    const i = idxLocalFor(id)
    if (i < 0) return
    updateControl(i, { ...controls[i], meta: value })
  }

  const handleSliderSave = async (id: string) => {
    const i = idxLocalFor(id)
    if (i < 0) return
    try {
      await updateMutation.mutateAsync({
        id,
        data: { goal: controls[i].meta },
      })
      toast.success('Meta atualizada com sucesso!')
      setEditingIndex(null)
    } catch {
      toast.error('Erro ao atualizar meta')
    }
  }

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header title="Controle de Gastos" subtitle="" newTransation={false} />
      <div className='w-full flex justify-between items-center gap-2'>
        <h2 className="text-lg font-semibold text-[#333C4D]">Todos os controles</h2>
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-44 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-full cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo controle
        </button>
      </div>
      <div className="w-full">
        <div className="flex flex-col gap-4">

          <ul className="lg:grid lg:grid-cols-3 flex flex-col gap-4">
            {sortedControls.map((c) => {
              const categoriaInfo = categoryStore.find((cat) => cat.id === c.categoryId)
              const iLocal = idxLocalFor(c.id)
              const isEditing = editingIndex === iLocal

        /*       const percentLimit = c.limit > 0 ? Math.min((c.spent / c.limit) * 100, 100) : 0 */
              const restanteLimite = Math.max(0, c.limit - c.spent)

              // métricas de tempo/estimativa
              const start = new Date(c.periodStart)
              const end = new Date(c.periodEnd)
              const today = new Date()
              const totalDays = Math.max(1, daysDiff(start, end) + 1) // inclui o dia final
              const elapsedDays = Math.min(totalDays, Math.max(1, daysDiff(start, today) + 1))
              const dailyAvg = c.spent / elapsedDays
              const projected = dailyAvg * totalDays

              const st = statusFrom(c)
              const statusToneClass =
                st.tone === 'danger'
                  ? 'bg-red-100 text-red-700'
                  : st.tone === 'warning'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-emerald-100 text-emerald-800'

              return (
                <li
                  key={c.id}
                  className="w-full flex flex-col gap-3 p-4 bg-white rounded-md border border-gray-200"
                >
                  {/* header com status */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusToneClass}`}>
                          {st.badge} {st.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{categoriaInfo?.name ?? 'Geral'}</p>
                      <span className="text-xs text-gray-500">{formatPeriod(c.periodStart, c.periodEnd)}</span>
                    </div>

                    <div className="flex gap-4">
                      <button
                        className="text-gray-500 hover:text-blue-500"
                        onClick={() => (isEditing ? handleSliderSave(c.id) : handleEditToggle(c.id))}
                        title={isEditing ? 'Salvar meta' : 'Editar meta'}
                      >
                        {isEditing ? <Check size={16} /> : <Pencil size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-gray-500 hover:text-red-500"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 1) Situação atual */}
                  <div className="text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Gasto acumulado: <strong>{toBRL(c.spent)}</strong>
                    </span>
                    <span>
                      % da meta: <strong>{Math.round(c.usagePctOfGoal)}%</strong>
                    </span>
                    <span>
                      % do limite: <strong>{Math.round(c.usagePctOfLimit)}%</strong>
                    </span>
                  </div>

                  {/* Slider da meta */}
                  <MetaSlider
                    value={isEditing ? controls[iLocal]?.meta ?? c.goal : controls[iLocal]?.meta ?? c.goal}
                    onChange={isEditing ? (val) => handleSliderChange(c.id, val) : undefined}
                    min={0}
                    max={controls[iLocal]?.limite ?? c.limit}
                    step={50}
                    disabled={!isEditing}
                  />

                  {/* 2) Progresso e comparações */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>Meta:</span>
                      <strong>{toBRL(controls[iLocal]?.meta ?? c.goal)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Limite:</span>
                      <strong>{toBRL(c.limit)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Restante até a meta:</span>
                      <strong>{toBRL(Math.max(0, (controls[iLocal]?.meta ?? c.goal) - c.spent))}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Restante até o limite:</span>
                      <strong className={c.overLimit ? 'text-red-600' : ''}>
                        {toBRL(restanteLimite)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Média diária:</span>
                      <strong>{toBRL(Number.isFinite(dailyAvg) ? dailyAvg : 0)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Projeção no ciclo:</span>
                      <strong>{toBRL(Number.isFinite(projected) ? projected : 0)}</strong>
                    </div>
                  </div>

                  {/* 3) Contexto e ações */}
                  <div className="text-xs text-gray-600 flex flex-col gap-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Ciclo: <strong>{c.periodType === 'monthly' ? 'Mensal' : 'Semanal'}</strong>
                      </span>
                      <span>
                        Alertas:{' '}
                        <strong>
                          {c.notify
                            ? (c.notifyAtPct.length ? c.notifyAtPct.join('%, ') + '%' : 'ligados')
                            : 'desligados'}
                        </strong>
                      </span>
                      <span>
                        Canais:{' '}
                        <strong>
                          {c.channels.length ? c.channels.join(', ') : '—'}
                        </strong>
                      </span>
                    </div>

                    <p className="mt-1">
                      {c.overLimit
                        ? 'Você ultrapassou o limite nesta categoria. Considere pausar gastos até o próximo ciclo.'
                        : c.usagePctOfLimit >= 80
                        ? 'Você já está próximo do limite. Evite grandes gastos até o fim do ciclo.'
                        : 'Tudo sob controle por enquanto. Mantenha o ritmo!'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Drawer para criar/editar controles */}
      <SpendingControlDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  )
}
