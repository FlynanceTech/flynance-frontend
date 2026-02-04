'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NumericFormat } from 'react-number-format'
import type { Transaction } from '@/types/Transaction'
import type { TransactionDTO } from '@/services/transactions'
import { useState, useEffect, useMemo } from 'react'
import CreditCardDrawer from '../CreditCardDrawer'
import { useTranscation } from '@/hooks/query/useTransaction'

import Select from 'react-select'
import type { StylesConfig } from 'react-select'
import { CategorySelect } from '../CategorySelect'

import type { CategoryDTO, CategoryResponse } from '@/services/category'
import { useCategories } from '@/hooks/query/useCategory'
import type { CreateCategoryDraft } from '../Categories/createCategoryModal' // ajuste path se necessário

type CategoryType = 'EXPENSE' | 'INCOME'

const schema = z.object({
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
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

/** agora -> value do datetime-local */
function nowDateTimeLocalValue() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

/** datetime-local -> ISO Z */
function dateTimeLocalToISOZ(localValue: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue) ? `${localValue}:00` : localValue
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) throw new Error('Data inválida. Verifique o campo de data e tente novamente.')
  return d.toISOString()
}

/** react-select type option */
type TypeOption = { value: CategoryType; label: string }

const typeOptions: TypeOption[] = [
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'INCOME', label: 'Receita' },
]

const typeSelectStyles: StylesConfig<TypeOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 9999,
    borderColor: state.isFocused ? '#CBD5E1' : '#E2E8F0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
    ':hover': { borderColor: '#CBD5E1' },
  }),
  valueContainer: (base) => ({ ...base, paddingLeft: 12, paddingRight: 8 }),
  placeholder: (base) => ({ ...base, color: '#64748B' }),
  menu: (base) => ({ ...base, borderRadius: 12, overflow: 'hidden' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#F1F5F9' : 'white',
    color: '#0F172A',
  }),
}

export default function TransactionDrawer({ open, onClose, initialData }: TransactionDrawerProps) {
  const { createMutation, updateMutation } = useTranscation({})
  const [openCardDrawer, setOpenCardDrawer] = useState(false)

  // ✅ categories + createCategoryMutation vem do seu hook
  const {
    categoriesQuery: { data: categories = [] },
    createMutation: createCategoryMutation,
  } = useCategories()

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
        type: (initialData.type as CategoryType) ?? 'EXPENSE',
        date: initialData.date ? isoToDateTimeLocalValue(initialData.date) : nowDateTimeLocalValue(),
      })
    } else {
      reset(defaultValues)
    }
  }, [initialData, reset])

  const typeSelected = watch('type')
  const categoryId = watch('categoryId')

  const selectedTypeOption = useMemo<TypeOption>(() => {
    return typeOptions.find((o) => o.value === typeSelected) ?? typeOptions[0]
  }, [typeSelected])

  // ✅ agora passamos o objeto completo pro CategorySelect (renderiza label/cor certo)
  const selectedCategoryObj = useMemo<CategoryResponse | null>(() => {
    if (!categoryId) return null
    return categories.find((c) => c.id === categoryId) ?? null
  }, [categories, categoryId])

  function buildPayload(data: FormData): TransactionDTO {
    return {
      description: data.description,
      categoryId: data.categoryId,
      value: data.value ?? 0,
      date: dateTimeLocalToISOZ(data.date),
      type: data.type,
      paymentType: 'DEBIT_CARD',
      origin: 'DASHBOARD',
    }
  }

  // ✅ agora cria categoria de verdade e retorna a criada (CategorySelect seleciona automaticamente)
  const handleCreateCategory = async (draft: CreateCategoryDraft): Promise<CategoryResponse> => {
    const payload: CategoryDTO = {
      name: draft.name,
      type: draft.type,
      color: draft.color,
      icon: draft.icon,
      keywords: draft.keywords,
    }

    // createMutation do seu hook já invalida ['categories'] no onSuccess
    const created = await createCategoryMutation.mutateAsync(payload)
    return created
  }

  const onSubmit = (data: FormData) => {
    const payload = buildPayload(data)

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, data: payload }, { onSuccess: () => onClose() })
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
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 cursor-pointer" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <form key={initialData?.id ?? 'new'} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Descrição */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  {...register('description')}
                  className="w-full border border-gray-300 rounded-full shadow px-4 py-2 text-sm"
                />
                {errors.description && <span className="text-red-500 text-xs">{errors.description.message}</span>}
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
                      value={typeOptions.find((o) => o.value === field.value) ?? selectedTypeOption}
                      options={typeOptions}
                      onChange={(opt) => {
                        const next = opt?.value ?? 'EXPENSE'
                        field.onChange(next)

                        // ✅ limpa categoria quando trocar o tipo (evita categoria inválida)
                        setValue('categoryId', '')
                      }}
                      isSearchable={false}
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                      styles={typeSelectStyles}
                    />
                  )}
                />

                {errors.type && <span className="text-red-500 text-xs">{errors.type.message}</span>}
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

                {errors.categoryId && <span className="text-red-500 text-xs">{errors.categoryId.message}</span>}
              </div>

              {/* Valor */}
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

              {/* Data */}
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
