'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NumericFormat } from 'react-number-format'
import { useEffect, useMemo } from 'react'
import Select from 'react-select'
import type { StylesConfig } from 'react-select'
import { CategorySelect } from '../CategorySelect'
import type { CategoryResponse, CategoryDTO } from '@/services/category'
import { useCategories } from '@/hooks/query/useCategory'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import { useCreditCardCharges } from '@/hooks/query/useCreditCardCharges'
import { Button } from '@/components/ui/button'
import type { CreateCategoryDraft } from '../Categories/createCategoryModal'
import type { CreditCardChargeItem } from '@/services/creditCardCharges'

const createSchema = z.object({
  cardId: z.string().min(1, 'Selecione um cartão'),
  description: z.string().min(1, 'Descrição obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  value: z.number({ invalid_type_error: 'Informe um valor válido' }).positive('Valor deve ser maior que zero'),
  purchaseDate: z
    .string()
    .min(1, 'Data obrigatória')
    .refine((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v), 'Formato de data inválido'),
  installmentCount: z.number().int().min(1).max(240),
})

const editSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  purchaseDate: z
    .string()
    .min(1, 'Data obrigatória')
    .refine((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v), 'Formato de data inválido'),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema> & Partial<Pick<CreateFormData, 'cardId' | 'value' | 'installmentCount'>>
type FormData = CreateFormData | EditFormData

interface Props {
  open: boolean
  onClose: () => void
  initialData?: CreditCardChargeItem
  initialCardId?: string | null
}

function nowDateTimeLocalValue() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function isoToDateTimeLocalValue(iso: string) {
  const d = new Date(iso)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function dateTimeLocalToISOZ(localValue: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue) ? `${localValue}:00` : localValue
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) throw new Error('Data inválida.')
  return d.toISOString()
}

type CardOption = { value: string; label: string }

const selectStyles: StylesConfig<CardOption, false> = {
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

export default function CreditCardChargeDrawer({ open, onClose, initialData, initialCardId }: Props) {
  const isEditing = Boolean(initialData)
  const { cardQuery } = useCardMutations()
  const { createChargeMutation, updateChargeMutation } = useCreditCardCharges()

  const {
    categoriesQuery: { data: categories = [] },
    createMutation: createCategoryMutation,
  } = useCategories()

  const cards = useMemo(() => cardQuery.data ?? [], [cardQuery.data])
  const cardOptions = useMemo<CardOption[]>(
    () =>
      cards
        .filter((c) => c.isActive)
        .map((c) => ({ value: c.id, label: c.last4 ? `${c.name} •••• ${c.last4}` : c.name })),
    [cards]
  )

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      cardId: '',
      description: '',
      categoryId: '',
      value: undefined,
      purchaseDate: nowDateTimeLocalValue(),
      installmentCount: 1,
    },
  })

  useEffect(() => {
    if (!open) return
    if (initialData) {
      reset({
        cardId: initialData.cardId,
        description: initialData.description,
        categoryId: initialData.category?.id ?? '',
        value: initialData.amountTotal,
        purchaseDate: isoToDateTimeLocalValue(initialData.purchaseDate),
        installmentCount: initialData.installmentCount,
      })
    } else {
      reset({
        cardId: initialCardId && cardOptions.some((option) => option.value === initialCardId)
          ? initialCardId
          : cardOptions[0]?.value ?? '',
        description: '',
        categoryId: '',
        value: undefined,
        purchaseDate: nowDateTimeLocalValue(),
        installmentCount: 1,
      })
    }
  }, [open, initialData, initialCardId, cardOptions, reset])

  const categoryId = useWatch({ control, name: 'categoryId' })
  const selectedCardId = useWatch({ control, name: 'cardId' })

  const selectedCategoryObj = useMemo<CategoryResponse | null>(
    () => (categoryId ? (categories.find((c) => c.id === categoryId) ?? null) : null),
    [categories, categoryId]
  )

  const selectedCardOption = useMemo<CardOption | null>(
    () => cardOptions.find((o) => o.value === selectedCardId) ?? null,
    [cardOptions, selectedCardId]
  )

  const handleCreateCategory = async (draft: CreateCategoryDraft): Promise<CategoryResponse> => {
    const payload: CategoryDTO = { name: draft.name, type: draft.type, color: draft.color, icon: draft.icon, keywords: draft.keywords }
    return createCategoryMutation.mutateAsync(payload)
  }

  const onSubmit = (data: FormData) => {
    if (isEditing && initialData) {
      updateChargeMutation.mutate(
        {
          chargeId: initialData.id,
          data: {
            description: data.description,
            categoryId: data.categoryId,
            purchaseDate: dateTimeLocalToISOZ(data.purchaseDate),
          },
        },
        { onSuccess: () => { reset(); onClose() } }
      )
      return
    }

    const createData = data as CreateFormData

    createChargeMutation.mutate(
      {
        cardId: createData.cardId,
        data: {
          description: createData.description,
          categoryId: createData.categoryId,
          value: createData.value,
          purchaseDate: dateTimeLocalToISOZ(createData.purchaseDate),
          installmentCount: createData.installmentCount,
        },
      },
      { onSuccess: () => { reset(); onClose() } }
    )
  }

  const isPending = createChargeMutation.isPending || updateChargeMutation.isPending

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-end">
        <DialogPanel className="bg-white w-4/5 max-w-md h-full rounded-l-xl shadow-lg p-6 space-y-6 overflow-y-auto">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {isEditing ? 'Editar Compra' : 'Nova Compra no Cartão'}
            </DialogTitle>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 cursor-pointer" aria-label="Fechar">
              <X size={20} />
            </button>
          </div>

          <form key={initialData?.id ?? 'new'} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Cartão — só na criação */}
            {!isEditing && (
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Cartão</label>
                <Controller
                  name="cardId"
                  control={control}
                  render={({ field }) => (
                    <Select<CardOption, false>
                      instanceId="cc-charge-card-select"
                      value={selectedCardOption}
                      options={cardOptions}
                      onChange={(opt) => field.onChange(opt?.value ?? '')}
                      isSearchable={false}
                      placeholder="Selecione um cartão"
                      noOptionsMessage={() => 'Nenhum cartão nomeado'}
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                      styles={selectStyles}
                    />
                  )}
                />
                {errors.cardId && <span className="text-red-400 text-xs">{errors.cardId.message}</span>}
              </div>
            )}

            {/* Descrição */}
            <div className="flex flex-col gap-2">
              <label className="block text-sm text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                {...register('description')}
                className="w-full border border-gray-300 rounded-full shadow px-4 py-2 text-sm"
                placeholder="Ex: Supermercado, Restaurante..."
              />
              {errors.description && <span className="text-red-400 text-xs">{errors.description.message}</span>}
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
                    typeFilter="EXPENSE"
                    placeholder="Selecione uma categoria"
                    allowCreate
                    onCreateCategory={handleCreateCategory}
                    className="w-full"
                  />
                )}
              />
              {errors.categoryId && <span className="text-red-400 text-xs">{errors.categoryId.message}</span>}
            </div>

            {/* Valor e parcelas — só na criação */}
            {!isEditing && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="block text-sm text-gray-700 mb-1">Valor total</label>
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

            {/* Data */}
            <div className="flex flex-col gap-2">
              <label className="block text-sm text-gray-700 mb-1">Data da compra</label>
              <input
                type="datetime-local"
                {...register('purchaseDate')}
                className="w-full border border-gray-300 rounded-full px-4 shadow py-2 text-sm"
              />
              {errors.purchaseDate && <span className="text-red-400 text-xs">{errors.purchaseDate.message}</span>}
            </div>

            <Button type="submit" disabled={isPending} variant="default">
              {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Registrar Compra'}
            </Button>

            {(createChargeMutation.isError || updateChargeMutation.isError) && (
              <p className="text-xs text-red-500">
                {(createChargeMutation.error as Error)?.message ??
                  (updateChargeMutation.error as Error)?.message ??
                  'Erro ao salvar compra.'}
              </p>
            )}
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
