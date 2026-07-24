'use client'

import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import { Button } from '@/components/ui/button'
import type { CreditCardResponse } from '@/services/cards'
import { CREDIT_CARD_COLORS_STORAGE_KEY, normalizeCreditCardColor, readCreditCardColorMap, writeCreditCardColorMap } from '@/app/dashboard/futuros/components/CreditCardManagerDrawer'

const CARD_COLORS = [
  '#0EA5E9', '#2563EB', '#7C3AED', '#E11D48', '#F97316', '#059669', '#111827',
]

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cartão'),
  closingDay: z.coerce.number().int().min(1, 'Use um dia entre 1 e 31').max(31, 'Use um dia entre 1 e 31'),
  dueDay: z.coerce.number().int().min(1, 'Use um dia entre 1 e 28').max(28, 'Use um dia entre 1 e 28'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (card: CreditCardResponse) => void
}

export default function SimpleCardDrawer({ open, onClose, onCreated }: Props) {
  const [color, setColor] = useState(CARD_COLORS[0])
  const { createCardMutation } = useCardMutations()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', closingDay: 15, dueDay: 25 },
  })

  const onSubmit = async (data: FormValues) => {
    const card = await createCardMutation.mutateAsync({
      name: data.name.trim(),
      brand: 'OTHER',
      limit: 0,
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      timezone: 'America/Sao_Paulo',
    })

    const normalized = normalizeCreditCardColor(color)
    if (normalized) {
      const colorMap = readCreditCardColorMap()
      colorMap[card.id] = normalized
      writeCreditCardColorMap(colorMap)
    }

    reset()
    setColor(CARD_COLORS[0])
    onCreated?.(card)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-end">
        <DialogPanel className="bg-white w-4/5 max-w-md h-full rounded-l-xl shadow-lg p-6 space-y-6 overflow-y-auto">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold text-gray-800">Novo Cartão</DialogTitle>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 cursor-pointer" aria-label="Fechar">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-700">Cor</label>
              <div className="flex flex-wrap gap-2 items-center">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-700 scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer p-0.5"
                  title="Cor personalizada"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-700">Nome do cartão</label>
              <input
                {...register('name')}
                className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm"
                placeholder="Ex: Nubank, Inter, Itaú..."
              />
              {errors.name && <span className="text-xs text-red-400">{errors.name.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-700">Dia de fechamento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  {...register('closingDay', { valueAsNumber: true })}
                  className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm"
                />
                {errors.closingDay && <span className="text-xs text-red-400">{errors.closingDay.message}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-700">Dia de vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  {...register('dueDay', { valueAsNumber: true })}
                  className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm"
                />
                {errors.dueDay && <span className="text-xs text-red-400">{errors.dueDay.message}</span>}
              </div>
            </div>

            <Button type="submit" disabled={createCardMutation.isPending}>
              {createCardMutation.isPending ? 'Criando...' : 'Criar Cartão'}
            </Button>

            {createCardMutation.isError && (
              <p className="text-xs text-red-500">
                {(createCardMutation.error as Error)?.message ?? 'Erro ao criar cartão.'}
              </p>
            )}
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
