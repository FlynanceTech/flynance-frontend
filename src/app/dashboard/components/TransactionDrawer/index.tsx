// src/components/TransactionDrawer/index.tsx
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
import type { TransactionDTO, PaymentType } from '@/services/transactions'
import { useState } from 'react'
/* import { useCardMutations } from '@/hooks/query/useCreditCards' */
import CreditCardDrawer from '../CreditCardDrawer'

// ---- enums do front para validação / UX
const paymentTypeValues = ['DEBIT_CARD', 'CREDIT_CARD', 'PIX', 'MONEY'] as const
type PaymentTypeEnum = (typeof paymentTypeValues)[number]

// ---- schema Zod com regra condicional de cartão
const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  value: z.number({ invalid_type_error: 'Informe um valor válido' }).positive('Valor deve ser maior que zero'),
  date: z.string().min(1, 'Data obrigatória'),
  type: z.enum(['EXPENSE', 'INCOME'], { required_error: 'Tipo é obrigatório' }),
  paymentType: z.enum(paymentTypeValues, { required_error: 'Forma de pagamento é obrigatória' }),
  cardId: z.string().uuid('Cartão inválido').optional(), // validado condicionalmente abaixo
}).superRefine((data, ctx) => {
  if (data.paymentType === 'CREDIT_CARD' && !data.cardId) {
    ctx.addIssue({
      path: ['cardId'],
      code: z.ZodIssueCode.custom,
      message: 'Selecione um cartão',
    })
  }
})

type FormData = z.infer<typeof schema>

interface TransactionDrawerProps {
  open: boolean
  onClose: () => void
  initialData?: Transaction
}

export default function TransactionDrawer({ open, onClose, initialData }: TransactionDrawerProps) {
  const { createMutation, updateMutation } = useTranscation({})
/*   const { cardQuery } = useCardMutations() */
  const [openCardDrawer, setOpenCardDrawer] = useState(false)

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
    defaultValues: {
      description: initialData?.description ?? '',
      categoryId: initialData?.category?.id ?? '',
      value: initialData?.value ?? undefined,
      type: initialData?.type ?? 'EXPENSE',
      paymentType: (initialData?.paymentType as PaymentTypeEnum) ?? 'DEBIT_CARD',
      // caso já tenha cardId em uma transação de crédito
      cardId: (initialData as unknown as { cardId?: string })?.cardId,
      date: initialData?.date
        ? new Date(initialData.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    },
  })

  const categorySelecionada = watch('categoryId')
  const typeSelected = watch('type')
/*   const paymentTypeSelected = watch('paymentType') */
/*   const cardIdSelected = watch('cardId')

  const hasCards = (cardQuery.data?.length ?? 0) > 0
  const cardsOptions = useMemo(
    () =>
      (cardQuery.data ?? []).map((c) => ({
        id: c.id,
        label: `${c.name}${c.last4 ? ` •••• ${c.last4}` : ''}`,
      })),
    [cardQuery.data],
  )
 */
  function buildPayload(data: FormData): TransactionDTO {
    const base: TransactionDTO = {
      description: data.description,
      categoryId: data.categoryId,
      value: data.value,
      date: new Date(data.date).toISOString(),
      type: data.type,
      paymentType: data.paymentType as PaymentType,
      origin: 'DASHBOARD',
    }
    // cardId vai somente quando for crédito
    if (data.paymentType === 'CREDIT_CARD' && data.cardId) {
      base.cardId = data.cardId
    }
    return base
  }

  const onSubmit = (data: FormData) => {
    const payload = buildPayload(data)

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, data: payload })
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          reset({
            description: '',
            categoryId: '',
            value: undefined,
            type: 'EXPENSE',
            paymentType: 'DEBIT_CARD',
            cardId: undefined,
            date: new Date().toISOString().split('T')[0],
          })
        },
      })
    }

    onClose()
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
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 cursor-pointer" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Descrição */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  {...register('description')}
                  className="w-full border border-gray-300 rounded-full shadow px-4 py-2 text-sm"
                />
                {errors.description && <span className="text-red-500 text-xs">{errors.description.message}</span>}
              </div>

              {/* Tipo (altera o filtro de categorias) */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tipo de transação</label>
                <TransactionTypeSelect value={typeSelected} onChange={(value) => setValue('type', value)} />
                {errors.type && <span className="text-red-500 text-xs">{errors.type.message}</span>}
              </div>

              {/* Categoria filtrada por tipo */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Categoria</label>
                <CategoriesSelect
                  value={categorySelecionada}
                  onChange={(value) => setValue('categoryId', value.id)}
                  typeFilter={typeSelected}
                />
                {errors.categoryId && <span className="text-red-500 text-xs">{errors.categoryId.message}</span>}
              </div>

              {/* Valor */}
              <div>
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

              {/* Data */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Data</label>
                <input
                  type="datetime-local"
                  {...register('date')}
                  className="w-full border border-gray-300 rounded-full px-4 shadow py-2 text-sm"
                />
                {errors.date && <span className="text-red-500 text-xs">{errors.date.message}</span>}
              </div>

              {/* Forma de pagamento */}
        {/*       <div>
                <label className="block text-sm text-gray-700 mb-1">Forma de pagamento</label>
                <select
                  className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm"
                  value={paymentTypeSelected}
                  onChange={(e) => {
                    const val = e.target.value as PaymentTypeEnum
                    setValue('paymentType', val)
                    // limpamos cardId se sair de crédito
                    if (val !== 'CREDIT_CARD') setValue('cardId', undefined)
                  }}
                >
                  <option value="DEBIT_CARD">Cartão de Débito</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="PIX">PIX</option>
                  <option value="MONEY">Dinheiro</option>
                </select>
                {errors.paymentType && <span className="text-red-500 text-xs">{errors.paymentType.message}</span>}
              </div> */}

              {/* Se for cartão de crédito, escolher o cartão */}
           {/*    {paymentTypeSelected === 'CREDIT_CARD' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-gray-700">Cartão</label>
                    {!hasCards && (
                      <button
                        type="button"
                        onClick={() => setOpenCardDrawer(true)}
                        className="text-emerald-700 text-xs underline cursor-pointer"
                      >
                        Cadastrar cartão
                      </button>
                    )}
                  </div>

                  {hasCards ? (
                    <select
                      className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm"
                      value={cardIdSelected ?? ''}
                      onChange={(e) => setValue('cardId', e.target.value)}
                    >
                      <option value="">Selecione um cartão</option>
                      {cardsOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Nenhum cartão cadastrado. Clique em <strong>Cadastrar cartão</strong>.
                    </div>
                  )}
                  {errors.cardId && <span className="text-red-500 text-xs">{errors.cardId.message}</span>}
                </div>
              )} */}

              <button
                type="submit"
                className="w-full mt-4 bg-[#22C55E] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full cursor-pointer"
              >
                {initialData ? 'Salvar Alterações' : 'Adicionar Transação'}
              </button>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Drawer de cadastro de cartão */}
      <CreditCardDrawer open={openCardDrawer} onClose={() => setOpenCardDrawer(false)} />
    </>
  )
}
