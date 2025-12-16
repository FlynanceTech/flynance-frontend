'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, CalendarDays, X } from 'lucide-react'
import { ControlWithProgress, useControls } from '@/hooks/query/useSpendingControl'
import { useCategories } from '@/hooks/query/useCategory'
import type {  Channel, CreateControlDTO } from '@/services/controls'
import type { ControlWithTransactions } from '../../controles/[id]/page'

type Props = {
  open: boolean
  onClose: () => void
  editing?: ControlWithProgress | ControlWithTransactions | null
}

const schema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria'),
    goal: z.coerce
    .number({
      invalid_type_error: 'Meta obrigatória',
    })
    .min(1, 'Meta obrigatória')
    .positive('Valor deve ser maior que zero'),
  periodType: z.enum(['monthly']),
  notify: z.boolean(),
  notifyAtPct: z.array(z.number()),
  includeSubcategories: z.boolean(),
  carryOver: z.boolean(),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'WHATSZAPP'])),
})

type FormData = z.infer<typeof schema>

export default function SpendingControlDrawer({ open, onClose, editing }: Props) {
  const { createMutation, updateMutation } = useControls()
  const { categoriesQuery: { data: categories = [] } } = useCategories()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: '',
      goal: undefined,
      periodType: 'monthly',
      notify: false,
      notifyAtPct: [],
      includeSubcategories: true,
      carryOver: false,
      channels: [],
    },
  })

  const notify = watch('notify')
  const channels = watch('channels')

  useEffect(() => {
    if (editing) {
      reset({
        categoryId: editing.categoryId ?? '',
        goal: editing.goal ?? 0,
        periodType: 'monthly',
        notify: editing.notify,
        notifyAtPct: editing.notifyAtPct ?? [],
        includeSubcategories: editing.includeSubcategories,
        carryOver: editing.carryOver,
        channels: editing.channels ?? [],
      })
    } else {
      reset()
    }
  }, [editing, reset])

  const onSubmit = async (data: FormData) => {
    const payload: CreateControlDTO = {
      ...data,
      resetDay: 1,
    }

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }

    onClose()
    reset()
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-end">
        <DialogPanel className="bg-white w-4/5 max-w-md h-full rounded-l-xl shadow-lg p-6 space-y-6 overflow-y-auto">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editing ? 'Editar Controle de Metas' : 'Novo Controle de Metas'}
            </DialogTitle>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex flex-col justify-between h-[95%]">
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col gap-2'>
                <label className="text-sm text-gray-700 ">Categoria</label>
                <select
                  {...register('categoryId')}
                  className="outline-none w-full border border-gray-200 rounded-full px-4 py-2 shadow text-sm"
                >
                  <option value="">Selecione...</option>
                  {categories.filter((c) => c.type === 'EXPENSE').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <span className="text-red-500 text-xs">{errors.categoryId.message}</span>}
              </div>

              <div  className='flex flex-col gap-2'>
                <label className="text-sm text-gray-700">Meta</label>
                <Controller
                  name="goal"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      value={field.value ?? ''} // evita "controlled/uncontrolled"
                      onChange={(e) => {
                        const raw = e.target.value
                        // se estiver vazio, manda undefined (deixa o Zod reclamar se precisar)
                        if (raw === '') {
                          field.onChange(undefined)
                        } else {
                          field.onChange(Number(raw))
                        }
                      }}
                      className="outline-none w-full border border-gray-200 rounded-full px-4 py-2 shadow text-sm"
                      placeholder="R$ 0,00"
                    />
                  )}
                />
                {errors.goal && <span className="text-red-500 text-xs">{errors.goal.message}</span>}
              </div>

              <div className='flex flex-col gap-2'>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Período
                </label>
                <input
                  type="text"
                  value="Mensal"
                  disabled
                  className="mt-1 w-full bg-gray-100 text-gray-500 border border-gray-300 rounded-full px-4 py-2 shadow text-sm"
                />
              </div>

              <div className="space-y-2 flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('notify')}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setValue('notify', checked)
                      if (!checked) setValue('channels', [])
                    }}
                  />
                  <span className="text-sm text-gray-700">Receber notificação</span>
                </label>

                <div className="flex gap-4">
                  {['IN_APP', 'EMAIL', 'WHATSZAPP'].map((channel) => (
                    <label key={channel} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={notify && channels.includes(channel as Channel)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          if (checked) {
                            setValue('channels', [...channels, channel as Channel])
                          } else {
                            setValue('channels', channels.filter((ch) => ch !== channel))
                          }
                        }}
                        disabled={!notify}
                      />
                      {channel === 'IN_APP' ? 'Dashboard' : channel === 'EMAIL' ? 'Email' : 'WhatsApp'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full mt-4 bg-primary hover:bg-secondary text-white font-medium py-2 px-4 rounded-full flex justify-center items-center gap-2"
            >
              
              {editing ?<>
                <Pencil className="w-4 h-4" />
                Salvar Alterações 
              </> 
                : 'Adicionar Controle'}
            </button>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
