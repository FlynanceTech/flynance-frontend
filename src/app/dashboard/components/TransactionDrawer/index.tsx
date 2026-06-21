'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Plus, X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NumericFormat } from 'react-number-format'
import type { Transaction } from '@/types/Transaction'
import { normalizePaymentType } from '@/services/transactions'
import type { PaymentType, TransactionDTO } from '@/services/transactions'
import { useState, useEffect, useMemo, useCallback } from 'react'
import CreditCardDrawer from '../CreditCardDrawer'
import { useTranscation } from '@/hooks/query/useTransaction'
import { useCardMutations } from '@/hooks/query/useCreditCards'

import Select from 'react-select'
import type { StylesConfig } from 'react-select'
import { CategorySelect } from '../CategorySelect'

import type { CategoryDTO, CategoryResponse } from '@/services/category'
import { useCategories } from '@/hooks/query/useCategory'
import type { CreateCategoryDraft } from '../Categories/createCategoryModal'
import { Button } from '@/components/ui/button'

type CategoryType = 'EXPENSE' | 'INCOME'

const schema = z
  .object({
    description: z.string().min(1, 'Descrição obrigatória'),
    categoryId: z.string().min(1, 'Categoria obrigatória'),
    value: z
      .number({ invalid_type_error: 'Informe um valor válido' })
      .positive('Valor deve ser maior que zero')
      .optional(),
    date: z
      .string()
      .min(1, 'Data obrigatória')
      .refine((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v), 'Formato de data inválido'),
    type: z.enum(['EXPENSE', 'INCOME'], { required_error: 'Tipo é obrigatório' }),
    paymentType: z.enum(
      ['DEBIT_CARD', 'CREDIT_CARD', 'PIX', 'BOLETO', 'TED', 'DOC', 'MONEY', 'CASH', 'OTHER'],
      { required_error: 'Forma de pagamento é obrigatória' }
    ),
    cardId: z.string().optional(),
    installmentCount: z.number().int().min(1).max(240).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === 'CREDIT_CARD') {
      if (!data.cardId) {
        ctx.addIssue({ code: 'custom', path: ['cardId'], message: 'Selecione um cartão' })
      }
    }
  })

type FormData = z.infer<typeof schema>

interface TransactionDrawerProps {
  open: boolean
  onClose: () => void
  initialData?: Transaction
  readOnly?: boolean
  defaultPaymentType?: PaymentType
}

function isoToDateTimeLocalValue(iso: string) {
  const d = new Date(iso)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function nowDateTimeLocalValue() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function dateTimeLocalToISOZ(localValue: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue) ? `${localValue}:00` : localValue
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) throw new Error('Data inválida. Verifique o campo de data e tente novamente.')
  return d.toISOString()
}

type TypeOption = { value: CategoryType; label: string }
type PaymentTypeOption = { value: PaymentType; label: string }
type CardOption = { value: string; label: string }

const typeOptions: TypeOption[] = [
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'INCOME', label: 'Receita' },
]

const paymentTypeOptions: PaymentTypeOption[] = [
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de débito' },
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TED', label: 'TED' },
  { value: 'DOC', label: 'DOC' },
  { value: 'MONEY', label: 'Dinheiro' },
  { value: 'CASH', label: 'Espécie' },
  { value: 'OTHER', label: 'Outro' },
]

function createSharedSelectStyles<Option>(): StylesConfig<Option, false> {
  return {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 9999,
    backgroundColor: 'hsl(var(--input))',
    borderColor: state.isFocused ? 'hsl(var(--ring) / 0.45)' : 'hsl(var(--border) / 0.24)',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.22)' : 'none',
    ':hover': { borderColor: 'hsl(var(--border) / 0.4)' },
  }),
  valueContainer: (base) => ({ ...base, paddingLeft: 12, paddingRight: 8 }),
  placeholder: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
  input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
  singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'hsl(var(--border) / 0.3)' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    ':hover': { color: 'hsl(var(--foreground))' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border) / 0.22)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
    overflow: 'hidden',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({ ...base, backgroundColor: 'hsl(var(--card))' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'hsl(var(--accent))' : state.isFocused ? 'hsl(var(--muted))' : 'transparent',
    color: 'hsl(var(--foreground))',
    cursor: 'pointer',
  }),
  noOptionsMessage: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
  }
}

const typeSelectStyles = createSharedSelectStyles<TypeOption>()
const paymentTypeSelectStyles = createSharedSelectStyles<PaymentTypeOption>()
const cardSelectStyles = createSharedSelectStyles<CardOption>()

export default function TransactionDrawer({
  open,
  onClose,
  initialData,
  readOnly = false,
  defaultPaymentType = 'MONEY',
}: TransactionDrawerProps) {
  const { createMutation, updateMutation } = useTranscation({})
  const [openCardDrawer, setOpenCardDrawer] = useState(false)

  const {
    categoriesQuery: { data: categories = [] },
    createMutation: createCategoryMutation,
  } = useCategories()

  const { cardQuery } = useCardMutations()
  const cards = useMemo(
    () => (cardQuery.data ?? []).filter((c) => c.isActive !== false),
    [cardQuery.data]
  )
  const cardOptions = useMemo<CardOption[]>(
    () => cards.map((c) => ({ value: c.id, label: c.last4 ? `${c.name} •••• ${c.last4}` : c.name })),
    [cards]
  )

  const buildDefaultValues = useCallback(
    (): FormData => ({
      description: '',
      categoryId: '',
      value: undefined,
      type: 'EXPENSE',
      paymentType: normalizePaymentType(defaultPaymentType) as FormData['paymentType'],
      date: nowDateTimeLocalValue(),
      cardId: '',
      installmentCount: 1,
    }),
    [defaultPaymentType]
  )

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(),
  })

  useEffect(() => {
    if (!open) return

    if (initialData) {
      reset({
        description: initialData.description ?? '',
        categoryId: initialData.category?.id ?? '',
        value: initialData.value ?? undefined,
        type: (initialData.type as CategoryType) ?? 'EXPENSE',
        paymentType: normalizePaymentType(initialData.paymentType ?? 'MONEY') as FormData['paymentType'],
        date: initialData.date ? isoToDateTimeLocalValue(initialData.date) : nowDateTimeLocalValue(),
        cardId: initialData.cardId ?? initialData.card?.id ?? '',
        installmentCount: initialData.installmentCount ?? 1,
      })
    } else {
      reset(buildDefaultValues())
    }
  }, [buildDefaultValues, initialData, open, reset])

  const typeSelected = useWatch({ control, name: 'type' })
  const paymentTypeSelected = useWatch({ control, name: 'paymentType' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const cardId = useWatch({ control, name: 'cardId' })
  const isCreditCard = paymentTypeSelected === 'CREDIT_CARD'

  const selectedCategoryObj = useMemo<CategoryResponse | null>(() => {
    if (!categoryId) return null
    return categories.find((c) => c.id === categoryId) ?? null
  }, [categories, categoryId])

  const selectedCardOption = useMemo<CardOption | null>(
    () => cardOptions.find((o) => o.value === cardId) ?? null,
    [cardOptions, cardId]
  )

  function buildPayload(data: FormData): TransactionDTO {
    return {
      description: data.description,
      categoryId: data.categoryId,
      value: data.value ?? 0,
      date: dateTimeLocalToISOZ(data.date),
      type: data.type,
      paymentType: data.paymentType,
      origin: 'DASHBOARD',
      ...(isCreditCard && data.cardId ? { cardId: data.cardId } : {}),
      ...(isCreditCard && data.installmentCount ? { installmentCount: data.installmentCount } : {}),
    }
  }

  const handleCreateCategory = async (draft: CreateCategoryDraft): Promise<CategoryResponse> => {
    const payload: CategoryDTO = {
      name: draft.name,
      type: draft.type,
      color: draft.color,
      icon: draft.icon,
      keywords: draft.keywords,
    }
    return createCategoryMutation.mutateAsync(payload)
  }

  const onSubmit = (data: FormData) => {
    if (readOnly) return

    const payload = buildPayload(data)

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, data: payload }, { onSuccess: () => onClose() })
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          reset(buildDefaultValues())
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
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 cursor-pointer" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <form key={initialData?.id ?? 'new'} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {readOnly && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Voce tem acesso somente leitura para este cliente.
                </div>
              )}

              {/* Descrição */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  {...register('description')}
                  className="w-full border border-gray-300 rounded-full shadow px-4 py-2 text-sm"
                />
                {errors.description && <span className="text-red-400 text-xs">{errors.description.message}</span>}
              </div>

              {/* Tipo */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Tipo de transação</label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select<TypeOption, false>
                      instanceId="tx-type-select"
                      value={typeOptions.find((o) => o.value === field.value) ?? typeOptions[0]}
                      options={typeOptions}
                      onChange={(opt) => {
                        field.onChange(opt?.value ?? 'EXPENSE')
                        setValue('categoryId', '')
                      }}
                      isSearchable={false}
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                      styles={typeSelectStyles}
                    />
                  )}
                />
                {errors.type && <span className="text-red-400 text-xs">{errors.type.message}</span>}
              </div>

              {/* Categoria */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Categoria</label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <CategorySelect
                      value={selectedCategoryObj}
                      onChange={(cat) => field.onChange((cat as CategoryResponse | null)?.id ?? '')}
                      typeFilter={typeSelected}
                      placeholder="Selecione uma categoria"
                      allowCreate
                      onCreateCategory={handleCreateCategory}
                      className="w-full"
                    />
                  )}
                />
                {errors.categoryId && <span className="text-red-400 text-xs">{errors.categoryId.message}</span>}
              </div>

              {/* Forma de pagamento */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Forma de pagamento</label>
                <Controller
                  name="paymentType"
                  control={control}
                  render={({ field }) => (
                    <Select<PaymentTypeOption, false>
                      instanceId="tx-payment-type-select"
                      value={paymentTypeOptions.find((o) => o.value === field.value) ?? paymentTypeOptions[0]}
                      options={paymentTypeOptions}
                      onChange={(opt) => {
                        field.onChange(opt?.value ?? 'MONEY')
                        if (opt?.value !== 'CREDIT_CARD') {
                          setValue('cardId', '')
                          setValue('installmentCount', 1)
                        }
                      }}
                      isSearchable={false}
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                      styles={paymentTypeSelectStyles}
                    />
                  )}
                />
                {errors.paymentType && <span className="text-red-400 text-xs">{errors.paymentType.message}</span>}
              </div>

              {/* Campos de cartão de crédito */}
              {isCreditCard && (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-gray-700">Cartão</label>
                      <button
                        type="button"
                        onClick={() => setOpenCardDrawer(true)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        Novo cartão
                      </button>
                    </div>
                    <Controller
                      name="cardId"
                      control={control}
                      render={({ field }) => (
                        <Select<CardOption, false>
                          instanceId="tx-card-select"
                          value={selectedCardOption}
                          options={cardOptions}
                          onChange={(opt) => field.onChange(opt?.value ?? '')}
                          isSearchable={false}
                          placeholder="Selecione um cartão"
                          noOptionsMessage={() => 'Nenhum cartão nomeado'}
                          menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                          styles={cardSelectStyles}
                        />
                      )}
                    />
                    {errors.cardId && <span className="text-red-400 text-xs">{errors.cardId.message}</span>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="block text-sm text-gray-700 mb-1">Número de parcelas</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={240}
                        {...register('installmentCount', { valueAsNumber: true })}
                        className="w-full border border-gray-300 rounded-full shadow px-4 py-2 text-sm"
                        placeholder="1"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">x</span>
                    </div>
                    {errors.installmentCount && <span className="text-red-400 text-xs">{errors.installmentCount.message}</span>}
                  </div>
                </>
              )}

              {/* Valor */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">
                  {isCreditCard ? 'Valor total' : 'Valor'}
                </label>
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
                {errors.value && <span className="text-red-400 text-xs">{errors.value.message}</span>}
              </div>

              {/* Data */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">
                  {isCreditCard ? 'Data da compra' : 'Data'}
                </label>
                <input
                  type="datetime-local"
                  {...register('date')}
                  className="w-full border border-gray-300 rounded-full px-4 shadow py-2 text-sm"
                />
                {errors.date && <span className="text-red-400 text-xs">{errors.date.message}</span>}
              </div>

              <Button
                type="submit"
                disabled={readOnly || createMutation.isPending || updateMutation.isPending}
                variant="default"
              >
                {readOnly ? 'Somente leitura' : initialData ? 'Salvar Alterações' : 'Adicionar Transação'}
              </Button>

              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-xs text-red-500">
                  {(createMutation.error as Error | undefined)?.message ??
                    (updateMutation.error as Error | undefined)?.message ??
                    'Erro ao salvar transação.'}
                </p>
              )}
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <CreditCardDrawer open={openCardDrawer} onClose={() => setOpenCardDrawer(false)} />
    </>
  )
}
