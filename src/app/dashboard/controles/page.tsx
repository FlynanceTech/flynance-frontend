'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Plus, ExternalLink, X } from 'lucide-react'
import { StarIcon } from '@phosphor-icons/react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

import Header from '../components/Header'
import SpendingControlDrawer from '../components/SpendingControlDrawer'

import { ControlWithProgress, useControls } from '@/hooks/query/useSpendingControl'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { useSpendingControlStore } from '@/stores/useSpendingControlStore'

const toBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function formatPeriodShort(startISO: string, endISO: string) {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatWeekdayShort(dateISO: string) {
  const d = new Date(dateISO)
  return d
    .toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' })
    .replace('.', '')
    .concat('.')
}

type Tone = 'ok' | 'warning' | 'danger'

function getTone(c: ControlWithProgress): Tone {
  if (c.overLimit || c.usagePctOfGoal >= 100) return 'danger'
  if (c.usagePctOfGoal >= 70) return 'warning'
  return 'ok'
}

/**
 * Gradient “progressivo”:
 * - esquerda colorida
 * - direita branca
 * - transição suave (fade) em torno do % (via/to positions)
 *
 * Tailwind: bg-gradient-to-r from-* via-* to-white
 * e controlamos as posições via CSS vars:
 * --tw-gradient-via-position / --tw-gradient-to-position
 */
function toneConfig(tone: Tone, usagePct: number) {
  const pct = clamp(usagePct, 0, 100)

  // não deixa comer todo o header (pra sempre sobrar branco pro "Meta")
  const stop = Math.min(92, pct)

  // largura da transição (em %)
  const fade = 8
  const viaPos = clamp(stop - fade, 0, 100)
  const toPos = clamp(stop + fade, 0, 100)

  if (tone === 'danger') {
    return {
      statusLabel: 'Estourou a meta',
      headerStops: 'from-red-400 via-red-400 to-white',
      headerTitle: 'text-gray-700',
      headerStyle: {
        ['--tw-gradient-via-position' as any]: `${viaPos}%`,
        ['--tw-gradient-to-position' as any]: `${toPos}%`,
      } as React.CSSProperties,
    }
  }

  if (tone === 'warning') {
    return {
      statusLabel: 'Próximo da meta',
      headerStops: 'from-yellow-400 via-yellow-400 to-white',
      headerTitle: 'text-gray-700',
      headerMeta: 'text-gray-700',
      headerStyle: {
        ['--tw-gradient-via-position' as any]: `${viaPos}%`,
        ['--tw-gradient-to-position' as any]: `${toPos}%`,
      } as React.CSSProperties,
    }
  }

  return {
    statusLabel: 'Dentro da meta',
    headerStops: 'from-emerald-400 via-emerald-400 to-white',
    headerTitle: 'text-gray-700',
    headerStyle: {
      ['--tw-gradient-via-position' as any]: `${viaPos}%`,
      ['--tw-gradient-to-position' as any]: `${toPos}%`,
    } as React.CSSProperties,
  }
}

export default function SpendingControlPage() {
  const { controlsQuery, deleteMutation, favoriteMutation } = useControls()
  const categoryStore = useCategoryStore((s) => s.categoryStore)
  const { addControl, controls, removeControl, resetControls } = useSpendingControlStore()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingControl, setEditingControl] = useState<ControlWithProgress | null>(null)

  // ====== MODAL FAVORITOS ======
  const [favoriteModalOpen, setFavoriteModalOpen] = useState(false)
  const [pendingFavorite, setPendingFavorite] = useState<ControlWithProgress | null>(null)
  const [selectedToRemoveId, setSelectedToRemoveId] = useState<string | null>(null)
  const [swappingFavorite, setSwappingFavorite] = useState(false)
  // ============================

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

  const sortedControls = useMemo(() => {
    const arr = Array.isArray(controlsQuery.data) ? (controlsQuery.data as ControlWithProgress[]) : []
    return [...arr].sort((a, b) => b.usagePctOfGoal - a.usagePctOfGoal)
  }, [controlsQuery.data])

  const favorites = useMemo(() => {
    const arr = Array.isArray(controlsQuery.data) ? (controlsQuery.data as ControlWithProgress[]) : []
    return arr.filter((c) => c.isFavorite)
  }, [controlsQuery.data])

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    categoryStore.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categoryStore])

  const getCategoryName = (c: ControlWithProgress) =>
    c.categoryId ? categoryNameById.get(c.categoryId) ?? 'Categoria' : 'Geral'

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

  // ====== FAVORITO COM REGRA DOS 3 ======
  const openSwapModal = (controlToFavorite: ControlWithProgress) => {
    setPendingFavorite(controlToFavorite)
    setSelectedToRemoveId(favorites[0]?.id ?? null)
    setFavoriteModalOpen(true)
  }

  const closeSwapModal = () => {
    setFavoriteModalOpen(false)
    setPendingFavorite(null)
    setSelectedToRemoveId(null)
    setSwappingFavorite(false)
  }

  const handleFavorite = async (control: ControlWithProgress) => {
    try {
      // desfavoritar direto
      if (control.isFavorite) {
        await favoriteMutation.mutateAsync({ id: control.id, isFavorite: false })
        toast.success('Removido dos favoritos')
        return
      }

      // favoritar: se já tem 3, abre modal
      if (favorites.length >= 3) {
        openSwapModal(control)
        return
      }

      await favoriteMutation.mutateAsync({ id: control.id, isFavorite: true })
      toast.success('Adicionado aos favoritos')
    } catch {
      toast.error('Erro ao atualizar favorito')
    }
  }

  const confirmSwapFavorite = async () => {
    if (!pendingFavorite || !selectedToRemoveId) {
      toast.error('Selecione qual favorito deve sair')
      return
    }

    try {
      setSwappingFavorite(true)
      await favoriteMutation.mutateAsync({ id: selectedToRemoveId, isFavorite: false })
      await favoriteMutation.mutateAsync({ id: pendingFavorite.id, isFavorite: true })
      toast.success('Favoritos atualizados')
      closeSwapModal()
    } catch {
      toast.error('Não foi possível trocar o favorito')
      setSwappingFavorite(false)
    }
  }
  // =====================================

  if (controlsQuery.isLoading) {
    return (
      <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
        <Header title="Controle de Metas" subtitle="" newTransation={false} />
        <div className="grid lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
              <div className="h-12 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-5/6 bg-gray-100 rounded" />
                <div className="h-6 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header title="Controle de Metas" subtitle="" newTransation={false} />

      {/* ====== MODAL TROCAR FAVORITO ====== */}
      <Dialog open={favoriteModalOpen} onClose={closeSwapModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <DialogTitle className="text-base font-semibold text-gray-800">
                Limite de favoritos (3)
              </DialogTitle>

              <button
                type="button"
                onClick={closeSwapModal}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                Você já tem <strong>3 controles</strong> nos favoritos. Escolha qual deve sair para adicionar:
                <strong className="ml-1">{pendingFavorite ? getCategoryName(pendingFavorite) : ''}</strong>
              </p>

              <div className="space-y-2">
                {favorites.map((f) => {
                  const selected = selectedToRemoveId === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedToRemoveId(f.id)}
                      className={clsx(
                        'w-full text-left rounded-lg border p-3 flex items-center justify-between transition',
                        selected ? 'border-primary bg-secondary/20' : 'border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">{getCategoryName(f)}</span>
                        <span className="text-xs text-gray-500">
                          Meta {toBRL(f.goal)} · {Math.round(f.usagePctOfGoal)}% usado
                        </span>
                      </div>
                      <span className={clsx('text-xs font-semibold', selected ? 'text-primary' : 'text-gray-500')}>
                        {selected ? 'Selecionado' : 'Selecionar'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeSwapModal}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                disabled={swappingFavorite}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmSwapFavorite}
                className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-primary hover:bg-secondary cursor-pointer disabled:opacity-60"
                disabled={swappingFavorite || !selectedToRemoveId || !pendingFavorite}
              >
                {swappingFavorite ? 'Trocando...' : 'Trocar favorito'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      {/* ================================== */}

      <div className="w-full flex justify-between items-center gap-2">
        <h2 className="text-lg font-semibold text-[#333C4D]">Todos os controles</h2>

        <button
          type="button"
          onClick={() => {
            setEditingControl(null)
            setDrawerOpen(true)
          }}
          className="w-44 inline-flex items-center justify-center gap-2 bg-primary hover:bg-secondary cursor-pointer text-white font-semibold px-4 py-2 rounded-full"
        >
          <Plus className="h-4 w-4" />
          Novo controle
        </button>
      </div>

      <ul className="lg:grid lg:grid-cols-3 flex flex-col gap-4">
        {sortedControls.map((c) => {
          const categoryName = getCategoryName(c)

          const restanteRaw = c.goal - c.spent
          const restante = Math.max(0, restanteRaw)
          const excedeu = Math.max(0, -restanteRaw)

          const tone = getTone(c)
          const cfg = toneConfig(tone, c.usagePctOfGoal)

          const periodo = formatPeriodShort(c.periodStart, c.periodEnd)
          const reinicia = formatWeekdayShort(c.nextResetAt)

          return (
            <li key={c.id}>
              <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                {/* overlay clicável (não engole clique dos botões pq eles ficam z-10) */}
                <Link href={`/dashboard/controles/${c.id}`} className="absolute inset-0" aria-label="Abrir controle" />

                {/* conteúdo */}
                <div className="relative z-10">
                  {/* Header */}
                  <div
                    className={clsx(
                      'px-5 py-3 flex items-center justify-between',
                      'bg-gradient-to-r',
                      cfg.headerStops,
                    )}
                    style={cfg.headerStyle}
                  >
                    <h3 className={`font-semibold ${cfg.headerTitle}`}>
                      {categoryName}
                    </h3>

                    <div className={`text-lg ${cfg.headerMeta}`}>
                      Meta: <span className="font-semibold">{toBRL(c.goal)}</span>
                    </div>
                  </div>

                  {/* Corpo */}
                  <div className="p-5">
                    <div className="flex flex-col gap-2 text-sm text-gray-700 w-full">
                      <div className="flex flex-col lg:flex-row justify-between w-full">
                        <div className="flex gap-2">
                          <span className="text-gray-500">Status:</span>
                          <strong>{cfg.statusLabel}</strong>
                        </div>

                        <div className="flex justify-between lg:justify-end gap-2">
                          <div>
                            <span className="text-gray-500">Período:</span> <strong>{periodo}</strong>
                          </div>
                          <div>
                            <span className="text-gray-500">Reinicia:</span> <strong>{reinicia}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center w-full">
                        <div className="flex gap-2">
                          <span className="text-gray-500">Gasto acumulado:</span>
                          <strong>{toBRL(c.spent)}</strong>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500">% da meta:</span>
                          <strong>{Math.round(c.usagePctOfGoal)}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Restante + ações */}
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div className="text-gray-700 flex lg:flex-row flex-col gap-2 lg:items-end">
                        <div className="text-lg text-gray-500">{excedeu > 0 ? 'Excedeu:' : 'Restante:'}</div>
                        <div className={clsx('text-xl font-semibold', excedeu > 0 ? 'text-red-600' : 'text-gray-800')}>
                          {excedeu > 0 ? toBRL(excedeu) : toBRL(restante)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleFavorite(c)}
                          className={clsx('cursor-pointer', c.isFavorite ? 'text-amber-400' : 'text-gray-400')}
                          title={c.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          aria-label="Favorito"
                        >
                          <StarIcon size={18} weight={c.isFavorite ? 'fill' : 'regular'} />
                        </button>

                        <Link
                          href={`/dashboard/controles/${c.id}`}
                          className="text-gray-500 hover:text-gray-700"
                          title="Abrir"
                          aria-label="Abrir"
                        >
                          <ExternalLink size={18} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="text-gray-500 hover:text-blue-400 cursor-pointer"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="text-gray-500 hover:text-red-500 cursor-pointer"
                          title="Excluir"
                          aria-label="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
