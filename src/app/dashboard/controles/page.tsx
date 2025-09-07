'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import { ControlWithProgress, useControls } from '@/hooks/query/useSpendingControl'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { useSpendingControlStore } from '@/stores/useSpendingControlStore'
import SpendingControlDrawer from '../components/SpendingControlDrawer'

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

function statusFrom(control: ControlWithProgress): { label: string; tone: 'ok' | 'warning' | 'danger'; badge: string } {
  if (control.overLimit || control.usagePctOfGoal >= 100) {
    return { label: 'Ultrapassou a meta', tone: 'danger', badge: '🔴' }
  }
  if (control.usagePctOfGoal >= 80) {
    return { label: 'Próximo da meta', tone: 'warning', badge: '🟡' }
  }
  return { label: 'Dentro da meta', tone: 'ok', badge: '🟢' }
}

export default function SpendingControlPage() {
  const { controlsQuery, deleteMutation } = useControls()
  const categoryStore = useCategoryStore((s) => s.categoryStore)
  const { addControl, controls, removeControl, resetControls } = useSpendingControlStore()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingControl, setEditingControl] = useState<ControlWithProgress | null>(null)

  useEffect(() => {
    if (Array.isArray(controlsQuery.data)) {
      resetControls()
      controlsQuery.data.forEach((c: ControlWithProgress) =>
        addControl({
          id: c.id,
          categoryId: c.categoryId ?? '',
          meta: c.goal,
          limite: c.goal,
          periodType: 'monthly',
          alert: false,
        }),
      )
    }
  }, [controlsQuery.data, addControl, resetControls])

  const sortedControls = Array.isArray(controlsQuery.data)
    ? [...controlsQuery.data as ControlWithProgress[]].sort(
        (a, b) => b.usagePctOfGoal - a.usagePctOfGoal,
      )
    : []

  const idxLocalFor = (id: string): number => controls.findIndex((x) => x.id === id)

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

  const handleEdit = (control: ControlWithProgress) => {
    setEditingControl(control)
    setDrawerOpen(true)
  }

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header title="Controle de Gastos" subtitle="" newTransation={false} />
      <div className='w-full flex justify-between items-center gap-2'>
        <h2 className="text-lg font-semibold text-[#333C4D]">Todos os controles</h2>
        <button
          onClick={() => {
            setEditingControl(null)
            setDrawerOpen(true)
          }}
          className="w-44 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-full"
        >
          <Plus className="h-4 w-4" />
          Novo controle
        </button>
      </div>

      <ul className="lg:grid lg:grid-cols-3 flex flex-col gap-4">
        {sortedControls.map((c) => {
          const categoriaInfo = categoryStore.find((cat) => cat.id === c.categoryId)
          const restante = Math.max(0, c.goal - c.spent)
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
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusToneClass}`}>
                    {st.badge} {st.label}
                  </span>
                  <p className="text-sm font-medium mt-1">{categoriaInfo?.name ?? 'Geral'}</p>
                  <span className="text-xs text-gray-500">{formatPeriod(c.periodStart, c.periodEnd)}</span>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleEdit(c)}
                    className="text-gray-500 hover:text-blue-500"
                    title="Editar"
                  >
                    <Pencil size={16} />
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

              <div className="text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                <span>Gasto acumulado: <strong>{toBRL(c.spent)}</strong></span>
                <span>% da meta: <strong>{Math.round(c.usagePctOfGoal)}%</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div className="flex justify-between"><span>Meta:</span><strong>{toBRL(c.goal)}</strong></div>
                <div className="flex justify-between"><span>Restante:</span><strong>{toBRL(restante)}</strong></div>
              </div>
            </li>
          )
        })}
      </ul>

      <SpendingControlDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingControl(null)
        }}
        editing={editingControl}
      />
    </section>
  )
}
