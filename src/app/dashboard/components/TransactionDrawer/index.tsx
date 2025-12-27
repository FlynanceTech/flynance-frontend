'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NumericFormat } from 'react-number-format'
import type { Transaction } from '@/types/Transaction'
import { CategoriesSelect, TransactionTypeSelect } from '../CategorySelect'
import { useTranscation } from '@/hooks/query/useTransaction'
import type { TransactionDTO } from '@/services/transactions'
import { useState, useEffect } from 'react'
import CreditCardDrawer from '../CreditCardDrawer'

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  value: z
    .number({ invalid_type_error: 'Informe um valor válido' })
    .positive('Valor deve ser maior que zero')
    .optional(),
  // datetime-local: "YYYY-MM-DDTHH:mm"
  date: z.string().min(1, 'Data obrigatória'),
  type: z.enum(['EXPENSE', 'INCOME'], { required_error: 'Tipo é obrigatório' }),
})

type FormData = z.infer<typeof schema>

interface TransactionDrawerProps {
  open: boolean
  onClose: () => void
  initialData?: Transaction
}

/** ISO do backend -> value do datetime-local (YYYY-MM-DDTHH:mm) */
function isoToDateTimeLocalValue(iso: string) {
  const d = new Date(iso)
  // converte pro "relógio local" sem timezone
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

/** agora -> value do datetime-local */
function nowDateTimeLocalValue() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

/**
 * datetime-local (YYYY-MM-DDTHH:mm) -> ISO com offset local:
 * "YYYY-MM-DDTHH:mm:00.000-03:00"
 *
 * Isso preserva a hora escolhida pelo usuário e ainda é ISO válido.
 */
function dateTimeLocalToISOWithOffset(localValue: string) {
  const d = new Date(localValue) // interpreta como horário local
  const tz = -d.getTimezoneOffset() // minutos em relação ao UTC (ex: -03:00 => -180 offset, aqui vira -(-180)=180? atenção abaixo)
  const sign = tz >= 0 ? '+' : '-'
  const abs = Math.abs(tz)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')

  const [datePart, timePartRaw] = localValue.split('T')
  const timePart = timePartRaw?.length === 5 ? `${timePartRaw}:00` : timePartRaw // garante segundos

  return `${datePart}T${timePart}.000${sign}${hh}:${mm}`
}

export default function TransactionDrawer({ open, onClose, initialData }: TransactionDrawerProps) {
  const { createMutation, updateMutation } = useTranscation({})
  const [openCardDrawer, setOpenCardDrawer] = useState(false)

  const defaultValues: FormData = {
    description: '',
    categoryId: '',
    value: undefined,
    type: 'EXPENSE',
    date: nowDateTimeLocalValue(),
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (initialData) {
      reset({
        description: initialData.description ?? '',
        categoryId: initialData.category?.id ?? '',
        value: initialData.value ?? undefined,
        type: initialData.type ?? 'EXPENSE',
        date: initialData.date ? isoToDateTimeLocalValue(initialData.date) : nowDateTimeLocalValue(),
      })
    } else {
      reset(defaultValues)
    }
  }, [initialData, reset])

  const categorySelecionada = watch('categoryId')
  const typeSelected = watch('type')

  function buildPayload(data: FormData): TransactionDTO {
    return {
      description: data.description,
      categoryId: data.categoryId,
      value: data.value ?? 0,
      // ✅ envia ISO válido sem mudar o "relógio" do usuário
      date: dateTimeLocalToISOWithOffset(data.date),
      type: data.type,
      paymentType: 'DEBIT_CARD',
      origin: 'DASHBOARD',
    }
  }

  const onSubmit = (data: FormData) => {
    const payload = buildPayload(data)

    if (initialData?.id) {
      updateMutation.mutate(
        { id: initialData.id, data: payload },
        { onSuccess: () => onClose() }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          reset({
            description: '',
            categoryId: '',
            value: undefined,
            type: 'EXPENSE',
            date: nowDateTimeLocalValue(),
          })
          onClose()
        },
      })
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-end">
          <DialogPanel className="bg-white w-4/5 max-w-md h-full rounded-l-xl shadow-lg p-6 space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-lg font-semibold text-gray-800">
                {initialData ? 'Editar Transação' : 'Nova Transação'}
              </DialogTitle>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <form
              key={initialData?.id ?? 'new'}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  {...register('description')}
                  className="w-full border border-gray-300 rounded-full shadow px-4 py-2 text-sm"
                />
                {errors.description && (
                  <span className="text-red-500 text-xs">{errors.description.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Tipo de transação</label>
                <TransactionTypeSelect value={typeSelected} onChange={(value) => setValue('type', value)} />
                {errors.type && <span className="text-red-500 text-xs">{errors.type.message}</span>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Categoria</label>
                <CategoriesSelect
                  value={categorySelecionada}
                  onChange={(value) => setValue('categoryId', value.id)}
                  typeFilter={typeSelected}
                />
                {errors.categoryId && (
                  <span className="text-red-500 text-xs">{errors.categoryId.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Valor</label>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      value={field.value ?? ''}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="R$ "
                      allowNegative={false}
                      placeholder="R$ 0,00"
                      className="outline-none w-full border border-gray-200 rounded-full px-4 py-2 shadow text-sm"
                      onValueChange={(values) => field.onChange(values.floatValue ?? undefined)}
                    />
                  )}
                />
                {errors.value && <span className="text-red-500 text-xs">{errors.value.message}</span>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Data</label>
                <input
                  type="datetime-local"
                  {...register('date')}
                  className="w-full border border-gray-300 rounded-full px-4 shadow py-2 text-sm"
                />
                {errors.date && <span className="text-red-500 text-xs">{errors.date.message}</span>}
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full mt-4 bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-full cursor-pointer disabled:opacity-60"
              >
                {initialData ? 'Salvar Alterações' : 'Adicionar Transação'}
              </button>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <CreditCardDrawer open={openCardDrawer} onClose={() => setOpenCardDrawer(false)} />
    </>
  )
}
