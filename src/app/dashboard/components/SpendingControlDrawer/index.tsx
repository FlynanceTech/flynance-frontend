// components/controls/SpendingControlDrawer.tsx
'use client'

import { Fragment, useState } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { CalendarDays, Plus } from 'lucide-react'
import type { CreateControlDTO, PeriodType, Channel } from '@/services/controls'
import { useControls } from '@/hooks/query/useSpendingControl'
import { useCategories } from '@/hooks/query/useCategory'

type Props = {
  open: boolean
  onClose: () => void
}

/** Estado local do formulário (UI), independente do DTO do backend */
type FormState = {
  categoryId: string | null
  goal: number
  limit: number
  periodType: PeriodType
  notify: boolean
  notifyAtPct: number[]
  includeSubcategories: boolean
  carryOver: boolean
  channels: Channel[]
}

export default function SpendingControlDrawer({ open, onClose }: Props) {
  const { createMutation } = useControls()
  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const [form, setForm] = useState<FormState>({
    categoryId: null,
    goal: 0,
    limit: 0,
    periodType: 'MONTHLY',
    notify: false,
    notifyAtPct: [],
    includeSubcategories: true,
    carryOver: false,
    channels: ['IN_APP'] as Channel[],
  })

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  /** Converte o estado do formulário no DTO esperado pelo backend */
  function toDTO(f: FormState): CreateControlDTO {
    const resetDay: number | null = f.periodType === 'MONTHLY' ? 1 : null
    const resetWeekday: number | null = f.periodType === 'WEEKLY' ? 0 : null

    return {
      categoryId: f.categoryId,
      goal: f.goal,
      limit: f.limit,
      periodType: f.periodType,
      resetDay,
      resetWeekday,
      includeSubcategories: f.includeSubcategories,
      carryOver: f.carryOver,
      notify: f.notify,
      notifyAtPct: f.notifyAtPct,
      channels: f.channels,
    }
  }

  // no componente
const toggleChannel = (ch: Channel, checked: boolean) => {
    updateForm(
      'channels',
      checked
        ? Array.from(new Set<Channel>([...form.channels, ch])) // -> Channel[]
        : form.channels.filter((c) => c !== ch)
    )
  }
  
  async function handleSubmit() {
    const payload = toDTO(form)
    await createMutation.mutateAsync(payload)
    onClose()
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* backdrop */}
        <TransitionChild
          as="div"
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-black/25"
        />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as="div"
                enter="transform transition ease-out duration-200"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-150"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
                className="pointer-events-auto w-screen max-w-md"
              >
                <DialogPanel className="h-full flex flex-col bg-white shadow-xl">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Novo controle de gastos</h2>
                  </div>

                  <div className="flex-1 overflow-auto p-6 space-y-4">
                    {/* Categoria */}
                    <div>
                      <label className="text-sm text-gray-600">Categoria</label>
                      <select
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={form.categoryId ?? ''} // não permitir null no value do select
                        onChange={(e) => updateForm('categoryId', e.target.value || null)}
                      >
                        <option value="">Selecione…</option>
                        {categories
                          .filter((c) => c.type === 'EXPENSE')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Meta e Limite */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-gray-600">Meta</label>
                        <input
                          type="number"
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={form.goal}
                          onChange={(e) => updateForm('goal', Number(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Limite</label>
                        <input
                          type="number"
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={form.limit}
                          onChange={(e) => updateForm('limit', Number(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                    </div>

                    {/* Período */}
                    <div>
                      <label className="text-sm text-gray-600 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Período
                      </label>
                      <select
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={form.periodType}
                        onChange={(e) => updateForm('periodType', e.target.value as PeriodType)}
                      >
                        <option value="MONTHLY">Mensal</option>
                        <option value="WEEKLY">Semanal</option>
                        <option value="BIMONTHLY">Bimestral</option>
                        <option value="QUARTERLY">Trimestral</option>
                        <option value="HALF_YEARLY">Semestral</option>
                        <option value="ANNUALLY">Anual</option>
                      </select>
                    </div>

                    {/* Notificações */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.notify}
                          onChange={(e) => updateForm('notify', e.target.checked)}
                        />
                        <span className="text-sm text-gray-700">Receber notificação</span>
                      </label>

                      {/* Canais (exemplo simples) */}
                      <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={form.channels.includes('IN_APP')}
    onChange={(e) => toggleChannel('IN_APP', e.target.checked)}
  />
  In‑app
</label>

<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={form.channels.includes('EMAIL')}
    onChange={(e) => toggleChannel('EMAIL', e.target.checked)}
  />
  Email
</label>

<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={form.channels.includes('WHATSZAPP')}
    onChange={(e) => toggleChannel('WHATSZAPP', e.target.checked)}
  />
  WhatsApp
</label>

                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-2">
                    <button
                      onClick={onClose}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Controle
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
