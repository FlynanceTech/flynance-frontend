'use client'

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useState, Fragment } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import type { CardBrand } from '@/services/cards'

const schema = z.object({
  name: z.string().min(2, 'Informe um nome'),
  brand: z.enum(['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OTHER']),
  last4: z.string().max(4).optional(),
  limit: z.number().positive('Informe um valor > 0'),
  closingDay: z.number().min(1).max(31),
  dueDay: z.number().min(1).max(31),
  timezone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = { open: boolean; onClose: () => void }

const BRANDS: { label: string; value: CardBrand }[] = [
  { label: 'Visa', value: 'VISA' },
  { label: 'Mastercard', value: 'MASTERCARD' },
  { label: 'Elo', value: 'ELO' },
  { label: 'American Express', value: 'AMEX' },
  { label: 'Hipercard', value: 'HIPERCARD' },
  { label: 'Outra', value: 'OTHER' },
]

export default function CreditCardDrawer({ open, onClose }: Props) {
  const { createCardMutation } = useCardMutations()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      brand: 'VISA',
      last4: '',
      limit: 0,
      closingDay: 1,
      dueDay: 10,
      timezone: 'America/Sao_Paulo',
    },
  })

  async function onSubmit(data: FormData) {
    try {
      setSubmitting(true)
      await createCardMutation.mutateAsync({
        name: data.name,
        brand: data.brand,
        last4: data.last4 || undefined,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        timezone: data.timezone || undefined,
      })
      reset()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-end">
          <TransitionChild
            as={Fragment}
            enter="transform duration-200"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform duration-150"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel className="h-full w-[92%] max-w-md bg-white shadow-xl p-6 overflow-y-auto rounded-l-2xl">
              <DialogTitle className="text-lg font-semibold text-gray-800">Novo cartão</DialogTitle>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-700">Nome no cartão</label>
                  <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...register('name')} />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm text-gray-700">Bandeira</label>
                  <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...register('brand')}>
                    {BRANDS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700">Final</label>
                    <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" maxLength={4} {...register('last4')} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-700">Limite (R$)</label>
                    <input type="number" step="0.01" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...register('limit', { valueAsNumber: true })} />
                    {errors.limit && <p className="text-xs text-red-600 mt-1">{errors.limit.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700">Fechamento</label>
                    <input type="number" min={1} max={31} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...register('closingDay', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Vencimento</label>
                    <input type="number" min={1} max={31} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...register('dueDay', { valueAsNumber: true })} />
                  </div>
                </div>

               {/*  <div>
                  <label className="block text-sm text-gray-700">Timezone</label>
                  <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...register('timezone')} />
                </div> */}

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60">
                    {submitting ? 'Salvando…' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
