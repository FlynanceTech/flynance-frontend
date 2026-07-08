'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Plus, X } from 'lucide-react'
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NumericFormat } from 'react-number-format'
import { useEffect, useMemo, useState } from 'react'
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
import type { CreditCardResponse } from '@/services/cards'
import SimpleCardDrawer from '../SimpleCardDrawer'

const PARCELADA_WARNING =
  'Essa é uma transação parcelada. Não é possível mudar o meio de pagamento (Débito, PIX ou TED). Caso queira fazer a mudança, exclua e refaça a operação. Fique tranquilo(a): caso você exclua essa transação, a Fly apagará quaisquer parcelas passadas e futuras, ajustando as suas contas.'

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
  cardId: z.string().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  value: z.number({ invalid_type_error: 'Informe um valor válido' }).positive('Valor deve ser maior que zero').optional(),
  purchaseDate: z
    .string()
    .min(1, 'Data obrigatória')
    .refine((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v), 'Formato de data inválido'),
  convertToPaymentType: z.string().optional(),
  installmentCount: z.number().int().min(1).max(240).optional(),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema> & Partial<Pick<CreateFormData, 'value'>>
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

function formatMonthKey(key: string): string {
  const [year, month] = key.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const m = Number(month) - 1
  return `${months[m] ?? month}/${String(year).slice(2)}`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type CardOption = { value: string; label: string }
type PaymentTypeOption = { value: string; label: string }

const nonCreditPaymentTypes: PaymentTypeOption[] = [
  { value: 'DEBIT_CARD', label: 'Cartão de débito' },
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TED', label: 'TED' },
  { value: 'MONEY', label: 'Dinheiro' },
]

function createSelectStyles<Option>(): StylesConfig<Option, false> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 40,
      borderRadius: 9999,
      backgroundColor: 'white',
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

const cardSelectStyles = createSelectStyles<CardOption>()
const paymentTypeSelectStyles = createSelectStyles<PaymentTypeOption>()

export default function CreditCardChargeDrawer({ open, onClose, initialData, initialCardId }: Props) {
  const isEditing = Boolean(initialData)
  const { cardQuery } = useCardMutations()
  const { createChargeMutation, updateChargeMutation, convertToTransactionMutation } = useCreditCardCharges()
  const [openSimpleCardDrawer, setOpenSimpleCardDrawer] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

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

  const isParcelada = isEditing && (initialData?.installmentCount ?? 1) > 1

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: (isEditing
      ? (zodResolver(editSchema) as unknown as Resolver<FormData>)
      : (zodResolver(createSchema) as unknown as Resolver<FormData>)),
    defaultValues: {
      cardId: '',
      description: '',
      categoryId: '',
      value: undefined,
      purchaseDate: nowDateTimeLocalValue(),
      installmentCount: 1,
      convertToPaymentType: '',
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
        convertToPaymentType: '',
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
        convertToPaymentType: '',
      })
    }
  }, [open, initialData, initialCardId, cardOptions, reset])

  const categoryId = useWatch({ control, name: 'categoryId' })
  const selectedCardId = useWatch({ control, name: 'cardId' })
  const convertToPaymentType = useWatch({ control, name: 'convertToPaymentType' as keyof FormData })
  const watchedInstallmentCount = useWatch({ control, name: 'installmentCount' })
  const isConverting = isEditing && Boolean(convertToPaymentType)

  const selectedCategoryObj = useMemo<CategoryResponse | null>(
    () => (categoryId ? (categories.find((c) => c.id === categoryId) ?? null) : null),
    [categories, categoryId]
  )

  const selectedCardOption = useMemo<CardOption | null>(
    () => cardOptions.find((o) => o.value === selectedCardId) ?? null,
    [cardOptions, selectedCardId]
  )

  const selectedConvertType = useMemo<PaymentTypeOption | null>(
    () => nonCreditPaymentTypes.find((o) => o.value === convertToPaymentType) ?? null,
    [convertToPaymentType]
  )

  useEffect(() => {
    if (!isEditing && open && cardOptions.length === 0 && !openSimpleCardDrawer) {
      setOpenSimpleCardDrawer(true)
    }
  }, [isEditing, open, cardOptions.length, openSimpleCardDrawer])

  const handleCreateCategory = async (draft: CreateCategoryDraft): Promise<CategoryResponse> => {
    const payload: CategoryDTO = { name: draft.name, type: draft.type, color: draft.color, icon: draft.icon, keywords: draft.keywords }
    return createCategoryMutation.mutateAsync(payload)
  }

  const handleCardCreated = (card: CreditCardResponse) => {
    setValue('cardId', card.id)
  }

  function executeUpdate(data: FormData) {
    if (!initialData) return
    const editData = data as EditFormData
    const newCount = editData.installmentCount
    const valueChanged =
      editData.value != null && Math.abs(Number(editData.value) - Number(initialData.amountTotal)) > 0.001
    updateChargeMutation.mutate(
      {
        chargeId: initialData.id,
        data: {
          description: data.description,
          categoryId: data.categoryId,
          purchaseDate: dateTimeLocalToISOZ(data.purchaseDate),
          ...(editData.cardId && editData.cardId !== initialData.cardId ? { cardId: editData.cardId } : {}),
          ...(newCount != null && newCount !== initialData.installmentCount ? { installmentCount: newCount } : {}),
          ...(valueChanged ? { value: editData.value } : {}),
        },
      },
      { onSuccess: () => { reset(); setConfirmModalOpen(false); setPendingFormData(null); onClose() } }
    )
  }

  const onSubmit = (data: FormData) => {
    if (isEditing && initialData && isConverting) {
      convertToTransactionMutation.mutate(
        {
          chargeId: initialData.id,
          data: {
            paymentType: String(convertToPaymentType),
            description: data.description,
            categoryId: data.categoryId,
          },
        },
        { onSuccess: () => { reset(); onClose() } }
      )
      return
    }

    if (isEditing && initialData) {
      const editData = data as EditFormData
      const newCount = editData.installmentCount
      const installmentChanged = newCount != null && newCount !== initialData.installmentCount
      const hasPaid = initialData.installments?.some((i) => i.status === 'paid')

      if (installmentChanged && hasPaid) {
        setPendingFormData(data)
        setConfirmModalOpen(true)
        return
      }

      executeUpdate(data)
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

  const isPending = createChargeMutation.isPending || updateChargeMutation.isPending || convertToTransactionMutation.isPending

  // Data for confirmation modal
  const oldInstallmentCount = initialData?.installmentCount ?? 1
  const newInstallmentCountForModal = Number(watchedInstallmentCount ?? oldInstallmentCount)
  const amountTotal = initialData?.amountTotal ?? 0
  const oldPerInstallment = amountTotal / oldInstallmentCount
  const newPerInstallment = amountTotal / (newInstallmentCountForModal || 1)
  const affectedMonths = (initialData?.installments ?? []).map((i) => formatMonthKey(i.statementMonthKey))

  return (
    <>
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
              {isConverting && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Ao salvar, esta compra sairá do cartão de crédito e será registrada como {selectedConvertType?.label ?? 'transação comum'}. Parcelas não pagas serão revertidas.
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

              {/* Mudar meio de pagamento (edit mode) */}
              {isEditing && !isConverting && (
                <div className="flex flex-col gap-2">
                  <label className="block text-sm text-gray-700 mb-1">Mover para outro meio de pagamento</label>
                  {isParcelada ? (
                    <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                      {PARCELADA_WARNING}
                    </div>
                  ) : (
                    <>
                      <Controller
                        name={'convertToPaymentType' as keyof FormData}
                        control={control}
                        render={({ field }) => (
                          <Select<PaymentTypeOption, false>
                            instanceId="cc-convert-type-select"
                            value={selectedConvertType}
                            options={nonCreditPaymentTypes}
                            onChange={(opt) => field.onChange(opt?.value ?? '')}
                            isSearchable={false}
                            isClearable
                            placeholder="Manter como cartão de crédito"
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                            styles={paymentTypeSelectStyles}
                          />
                        )}
                      />
                      <p className="text-xs text-slate-400">Selecione apenas se quiser mover esta compra para outro meio de pagamento.</p>
                    </>
                  )}
                </div>
              )}

              {/* Cartão — mostrado se não estiver convertendo */}
              {!isConverting && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-gray-700">Cartão</label>
                    <button
                      type="button"
                      onClick={() => setOpenSimpleCardDrawer(true)}
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
                        instanceId="cc-charge-card-select"
                        value={selectedCardOption}
                        options={cardOptions}
                        onChange={(opt) => field.onChange(opt?.value ?? '')}
                        isSearchable={false}
                        placeholder="Selecione um cartão"
                        noOptionsMessage={() => 'Nenhum cartão cadastrado'}
                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                        styles={cardSelectStyles}
                      />
                    )}
                  />
                  {errors.cardId && <span className="text-red-400 text-xs">{errors.cardId.message}</span>}
                  {isEditing && (
                    <p className="text-xs text-slate-400">Trocar o cartão recalculará as parcelas para a fatura do novo cartão.</p>
                  )}
                </div>
              )}

              {/* Número de parcelas — criação E edição */}
              {!isConverting && (
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
                  {isEditing && (
                    <p className="text-xs text-slate-400">Alterar o número de parcelas recalculará o valor mensal (passado e futuro) dessa operação.</p>
                  )}
                </div>
              )}

              {/* Valor — criação e edição (oculto apenas ao converter para outro meio) */}
              {!isConverting && (
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
              )}

              {/* Data */}
              {!isConverting && (
                <div className="flex flex-col gap-2">
                  <label className="block text-sm text-gray-700 mb-1">Data da compra</label>
                  <input
                    type="datetime-local"
                    {...register('purchaseDate')}
                    className="w-full border border-gray-300 rounded-full px-4 shadow py-2 text-sm"
                  />
                  {errors.purchaseDate && <span className="text-red-400 text-xs">{errors.purchaseDate.message}</span>}
                </div>
              )}

              <Button type="submit" disabled={isPending} variant="default">
                {isPending
                  ? 'Salvando...'
                  : isConverting
                  ? `Converter para ${selectedConvertType?.label ?? 'transação comum'}`
                  : isEditing
                  ? 'Salvar Alterações'
                  : 'Registrar Compra'}
              </Button>

              {(createChargeMutation.isError || updateChargeMutation.isError || convertToTransactionMutation.isError) && (
                <p className="text-xs text-red-500">
                  {(createChargeMutation.error as Error)?.message ??
                    (updateChargeMutation.error as Error)?.message ??
                    (convertToTransactionMutation.error as Error)?.message ??
                    'Erro ao salvar compra.'}
                </p>
              )}
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Confirmation modal for installmentCount change with paid installments */}
      <Dialog open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} className="relative z-[70]">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <DialogTitle className="text-base font-bold text-gray-900">Opa!</DialogTitle>
            <p className="text-sm text-gray-600">
              Essa transação já teve parcelas pagas anteriormente. Tem certeza que deseja alterar o número de parcelas? Isso vai afetar os pagamentos passados e futuros referentes a essa transação.
            </p>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 space-y-1">
              <p><span className="font-semibold">Antes:</span> {oldInstallmentCount}x de {formatCurrency(oldPerInstallment)}</p>
              <p><span className="font-semibold">Novo:</span> {newInstallmentCountForModal}x de {formatCurrency(newPerInstallment)}</p>
              {affectedMonths.length > 0 && (
                <p><span className="font-semibold">Meses reajustados:</span> {affectedMonths.join(', ')}</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setConfirmModalOpen(false); setPendingFormData(null) }}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={updateChargeMutation.isPending}
                onClick={() => { if (pendingFormData) executeUpdate(pendingFormData) }}
                className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {updateChargeMutation.isPending ? 'Salvando...' : 'Prosseguir'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <SimpleCardDrawer
        open={openSimpleCardDrawer}
        onClose={() => setOpenSimpleCardDrawer(false)}
        onCreated={handleCardCreated}
      />
    </>
  )
}
