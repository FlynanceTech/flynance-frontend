'use client'

import { Fragment, useEffect, useState } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { CalendarDays, Pencil } from 'lucide-react'
import type { CreateControlDTO, PeriodType, Channel } from '@/services/controls'
import { ControlWithProgress, useControls } from '@/hooks/query/useSpendingControl'
import { useCategories } from '@/hooks/query/useCategory'
import { ControlWithTransactions } from '../../controles/[id]/page'

type Props = {
  open: boolean
  onClose: () => void
  editing?: ControlWithProgress | ControlWithTransactions | null
}

type FormState = {
  categoryId: string | null
  goal: number
  periodType: PeriodType
  notify: boolean
  notifyAtPct: number[]
  includeSubcategories: boolean
  carryOver: boolean
  channels: Channel[]
}

const defaultFormState: FormState = {
  categoryId: null,
  goal: 0,
  periodType: 'monthly',
  notify: false,
  notifyAtPct: [],
  includeSubcategories: true,
  carryOver: false,
  channels: ['IN_APP', 'WHATSZAPP', 'EMAIL'],
}

export default function SpendingControlDrawer({ open, onClose, editing }: Props) {
  const { createMutation, updateMutation } = useControls()
  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const [form, setForm] = useState<FormState>(defaultFormState)

  const resetForm = () => setForm(defaultFormState)

  useEffect(() => {
    if (editing) {
      setForm({
        categoryId: editing.categoryId,
        goal: editing.goal,
        periodType: 'monthly',
        notify: editing.notify,
        notifyAtPct: editing.notifyAtPct,
        includeSubcategories: editing.includeSubcategories,
        carryOver: editing.carryOver,
        channels: editing.channels,
      })
    } else {
      resetForm()
    }
  }, [editing])

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toDTO(f: FormState): CreateControlDTO {
    return {
      categoryId: f.categoryId,
      goal: f.goal,
      periodType: f.periodType,
      resetDay: f.periodType === 'monthly' ? 1 : null,
      includeSubcategories: f.includeSubcategories,
      carryOver: f.carryOver,
      notify: f.notify,
      notifyAtPct: f.notifyAtPct,
      channels: f.channels,
    }
  }

  const toggleChannel = (ch: Channel, checked: boolean) => {
    updateForm(
      'channels',
      checked
        ? Array.from(new Set<Channel>([...form.channels, ch]))
        : form.channels.filter((c) => c !== ch)
    )
  }

  async function handleSubmit() {
    const payload = toDTO(form)

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }

    onClose()
    resetForm()
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                    <h2 className="text-lg font-semibold">
                      {editing ? 'Editar controle de Metas' : 'Novo controle de Metas'}
                    </h2>
                  </div>

                  <div className="flex-1 overflow-auto p-6 space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Categoria</label>
                      <select
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={form.categoryId ?? ''}
                        onChange={(e) => updateForm('categoryId', e.target.value || null)}
                      >
                        <option value="">Selecione…</option>
                        {categories.filter((c) => c.type === 'EXPENSE').map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

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
                      <label className="text-sm text-gray-600 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Período
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Mensal"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.notify}
                          onChange={(e) => {
                            const checked = e.target.checked
                            updateForm('notify', checked)
                            if (!checked) updateForm('channels', [])
                          }}
                        />
                        <span className="text-sm text-gray-700">Receber notificação</span>
                      </label>

                      <div className="flex gap-4">
                        {['IN_APP', 'EMAIL', 'WHATSZAPP'].map((channel) => (
                          <label key={channel} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.channels.includes(channel as Channel)}
                              onChange={(e) => toggleChannel(channel as Channel, e.target.checked)}
                              disabled={!form.notify}
                            />
                            {channel === 'IN_APP' ? 'Dashboard' : channel === 'EMAIL' ? 'Email' : 'WhatsApp'}
                          </label>
                        ))}
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
                      <Pencil className="w-4 h-4" /> {editing ? 'Salvar alterações' : 'Adicionar Controle'}
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
