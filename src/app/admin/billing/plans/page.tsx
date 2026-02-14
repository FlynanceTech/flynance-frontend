'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useAdminPlan,
  useAdminPlans,
  useCreateAdminPlan,
  useDeleteAdminPlan,
  useUpdateAdminPlan,
} from '@/hooks/query/useAdmin'

const featureSchema = z.object({
  label: z.string().trim().min(1, 'Label obrigatorio'),
  key: z.string().optional(),
  value: z.string().optional(),
})

const planSchema = z.object({
  name: z.string().trim().min(2, 'Nome minimo de 2 caracteres'),
  slug: z.string().trim().min(2, 'Slug minimo de 2 caracteres'),
  description: z.string().optional(),
  priceCents: z.coerce.number().int().min(0, 'Preco deve ser maior ou igual a 0'),
  currency: z.string().trim().min(3, 'Moeda invalida').max(3, 'Moeda invalida').default('BRL'),
  priceId: z.string().optional(),
  installmentPriceId: z.string().optional(),
  yearlyPriceId: z.string().optional(),
  allowCancel: z.boolean().default(true),
  commitmentMonths: z.union([z.literal(''), z.coerce.number().int().min(1).max(120)]).optional(),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).default('MONTHLY'),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  trialDays: z.coerce.number().int().min(0).max(365).default(0),
  features: z.array(featureSchema).default([]),
})

type PlanFormValues = z.input<typeof planSchema>
type BoolFilter = 'all' | 'true' | 'false'

function defaultValues(): PlanFormValues {
  return {
    name: '',
    slug: '',
    description: '',
    priceCents: 0,
    currency: 'BRL',
    priceId: '',
    installmentPriceId: '',
    yearlyPriceId: '',
    allowCancel: true,
    commitmentMonths: '',
    period: 'MONTHLY',
    isActive: true,
    isPublic: true,
    isFeatured: false,
    trialDays: 7,
    features: [],
  }
}

function formatCurrencyFromCents(value: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format((Number(value) || 0) / 100)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('pt-BR')
}

function mapFilterToBoolean(value: BoolFilter): boolean | undefined {
  if (value === 'all') return undefined
  return value === 'true'
}

export default function AdminBillingPlansPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState<BoolFilter>('all')
  const [isPublicFilter, setIsPublicFilter] = useState<BoolFilter>('all')
  const [appliedIsActive, setAppliedIsActive] = useState<BoolFilter>('all')
  const [appliedIsPublic, setAppliedIsPublic] = useState<BoolFilter>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)

  const plansQuery = useAdminPlans({
    page,
    limit: 20,
    search: search || undefined,
    isActive: mapFilterToBoolean(appliedIsActive),
    isPublic: mapFilterToBoolean(appliedIsPublic),
  })

  const createPlanMutation = useCreateAdminPlan()
  const updatePlanMutation = useUpdateAdminPlan()
  const deletePlanMutation = useDeleteAdminPlan()
  const planDetailQuery = useAdminPlan(editingPlanId ?? undefined, isModalOpen && Boolean(editingPlanId))

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: defaultValues(),
  })

  const featuresArray = useFieldArray({
    control: form.control,
    name: 'features',
  })

  const plans = plansQuery.data?.plans ?? []
  const meta = plansQuery.data?.meta
  const totalPages = useMemo(() => {
    if (!meta) return 1
    return Math.max(1, Math.ceil(meta.total / Math.max(1, meta.limit)))
  }, [meta])

  useEffect(() => {
    if (!isModalOpen || !editingPlanId || !planDetailQuery.data) return

    const plan = planDetailQuery.data
    form.reset({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      priceCents: plan.priceCents,
      currency: (plan.currency || 'BRL').toUpperCase(),
      priceId: plan.priceId || '',
      installmentPriceId: plan.installmentPriceId || '',
      yearlyPriceId: plan.yearlyPriceId || '',
      allowCancel: plan.allowCancel,
      commitmentMonths: plan.commitmentMonths ?? '',
      period: plan.period,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      isFeatured: plan.isFeatured,
      trialDays: plan.trialDays ?? 0,
      features: (plan.features ?? []).map((feature) => ({
        label: feature.label,
        key: feature.key || '',
        value: feature.value || '',
      })),
    })
  }, [isModalOpen, editingPlanId, planDetailQuery.data, form])

  const openCreateModal = () => {
    setEditingPlanId(null)
    form.reset(defaultValues())
    setIsModalOpen(true)
  }

  const openEditModal = (planId: string) => {
    setEditingPlanId(planId)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPlanId(null)
    form.reset(defaultValues())
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description?.trim() || undefined,
      priceCents: Number(values.priceCents ?? 0),
      currency: String(values.currency ?? 'BRL').trim().toUpperCase(),
      priceId: values.priceId?.trim() || undefined,
      installmentPriceId: values.installmentPriceId?.trim() || undefined,
      yearlyPriceId: values.yearlyPriceId?.trim() || undefined,
      allowCancel: values.allowCancel,
      commitmentMonths:
        values.commitmentMonths === '' || values.commitmentMonths == null
          ? null
          : Number(values.commitmentMonths),
      period: values.period ?? 'MONTHLY',
      isActive: values.isActive,
      isPublic: values.isPublic,
      isFeatured: values.isFeatured,
      trialDays: Number(values.trialDays ?? 0),
      features: (values.features ?? [])
        .map((feature) => ({
          label: feature.label.trim(),
          key: feature.key?.trim() || undefined,
          value: feature.value?.trim() || undefined,
        }))
        .filter((feature) => Boolean(feature.label)),
    }

    if (editingPlanId) {
      await updatePlanMutation.mutateAsync({
        planId: editingPlanId,
        payload,
      })
    } else {
      await createPlanMutation.mutateAsync(payload)
    }

    closeModal()
  })

  const handleDelete = async (planId: string, hardDelete = false) => {
    const confirmed = window.confirm(
      hardDelete
        ? 'Tem certeza que deseja excluir definitivamente este plano?'
        : 'Tem certeza que deseja excluir este plano?'
    )
    if (!confirmed) return

    await deletePlanMutation.mutateAsync({ planId, hardDelete })
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-600">Busca</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nome ou slug"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Ativo</span>
            <select
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value as BoolFilter)}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            >
              <option value="all">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Publico</span>
            <select
              value={isPublicFilter}
              onChange={(e) => setIsPublicFilter(e.target.value as BoolFilter)}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            >
              <option value="all">Todos</option>
              <option value="true">Publicos</option>
              <option value="false">Privados</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPage(1)
                setSearch(searchInput.trim())
                setAppliedIsActive(isActiveFilter)
                setAppliedIsPublic(isPublicFilter)
              }}
              className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0]"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setIsActiveFilter('all')
                setIsPublicFilter('all')
                setAppliedIsActive('all')
                setAppliedIsPublic('all')
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Criar plano
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">Planos</h3>

        {plansQuery.isLoading ? (
          <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-100" />
        ) : plansQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {plansQuery.error instanceof Error
              ? plansQuery.error.message
              : 'Erro ao carregar planos.'}
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Nenhum plano encontrado.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Slug</th>
                  <th className="pb-2 font-medium">Preco</th>
                  <th className="pb-2 font-medium">Periodo</th>
                  <th className="pb-2 font-medium">Ativo</th>
                  <th className="pb-2 font-medium">Publico</th>
                  <th className="pb-2 font-medium">Destaque</th>
                  <th className="pb-2 font-medium text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-slate-100">
                    <td className="py-3">{plan.name}</td>
                    <td className="py-3 text-slate-600">{plan.slug}</td>
                    <td className="py-3">{formatCurrencyFromCents(plan.priceCents, plan.currency)}</td>
                    <td className="py-3">{plan.period}</td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {plan.isActive ? 'Sim' : 'Nao'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          plan.isPublic ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {plan.isPublic ? 'Sim' : 'Nao'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          plan.isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {plan.isFeatured ? 'Sim' : 'Nao'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(plan.id)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(plan.id, false)}
                          disabled={deletePlanMutation.isPending}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(plan.id, true)}
                          disabled={deletePlanMutation.isPending}
                          className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Definitivo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Pagina {page} de {totalPages}
            {meta ? ` · Total: ${meta.total}` : ''}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!meta?.hasNext || page >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              Proxima
            </button>
          </div>
        </div>
      </article>

      <Dialog open={isModalOpen} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-lg font-semibold text-[#333C4D]">
              {editingPlanId ? 'Editar plano' : 'Criar plano'}
            </DialogTitle>

            {editingPlanId && planDetailQuery.isLoading ? (
              <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-100" />
            ) : editingPlanId && planDetailQuery.isError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {planDetailQuery.error instanceof Error
                  ? planDetailQuery.error.message
                  : 'Erro ao carregar detalhes do plano.'}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  <span className="text-slate-600">Nome</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('name')}
                  />
                  <span className="text-xs text-red-600">{form.formState.errors.name?.message}</span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Slug</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('slug')}
                  />
                  <span className="text-xs text-red-600">{form.formState.errors.slug?.message}</span>
                </label>

                <label className="flex flex-col gap-1 text-sm md:col-span-3">
                  <span className="text-slate-600">Descricao</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('description')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Preco (centavos)</span>
                  <input
                    type="number"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('priceCents')}
                  />
                  <span className="text-xs text-red-600">
                    {form.formState.errors.priceCents?.message}
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Moeda</span>
                  <input
                    type="text"
                    maxLength={3}
                    className="h-10 rounded-xl border border-slate-200 px-3 uppercase outline-none focus:border-[#7CB8D8]"
                    {...form.register('currency')}
                  />
                  <span className="text-xs text-red-600">{form.formState.errors.currency?.message}</span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Periodo</span>
                  <select
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('period')}
                  >
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">priceId</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('priceId')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">installmentPriceId</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('installmentPriceId')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">yearlyPriceId</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('yearlyPriceId')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Commitment months</span>
                  <input
                    type="number"
                    min={1}
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('commitmentMonths')}
                  />
                  <span className="text-xs text-red-600">
                    {form.formState.errors.commitmentMonths?.message}
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Trial days</span>
                  <input
                    type="number"
                    min={0}
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('trialDays')}
                  />
                  <span className="text-xs text-red-600">{form.formState.errors.trialDays?.message}</span>
                </label>

                <div className="md:col-span-3 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('allowCancel')} />
                    Allow cancel
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('isActive')} />
                    Is active
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('isPublic')} />
                    Is public
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('isFeatured')} />
                    Is featured
                  </label>
                  <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-1">
                    Criado em: {formatDate(planDetailQuery.data?.createdAt)}
                  </p>
                </div>

                <div className="md:col-span-3 rounded-xl border border-slate-200 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#333C4D]">Features</h4>
                    <button
                      type="button"
                      onClick={() => featuresArray.append({ label: '', key: '', value: '' })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Adicionar feature
                    </button>
                  </div>

                  {featuresArray.fields.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhuma feature adicionada.</p>
                  ) : (
                    <div className="space-y-2">
                      {featuresArray.fields.map((field, index) => (
                        <div key={field.id} className="grid gap-2 md:grid-cols-3">
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="text-slate-500">Label</span>
                            <input
                              type="text"
                              className="h-9 rounded-lg border border-slate-200 px-2 outline-none focus:border-[#7CB8D8]"
                              {...form.register(`features.${index}.label`)}
                            />
                            <span className="text-red-600">
                              {form.formState.errors.features?.[index]?.label?.message}
                            </span>
                          </label>

                          <label className="flex flex-col gap-1 text-xs">
                            <span className="text-slate-500">Key</span>
                            <input
                              type="text"
                              className="h-9 rounded-lg border border-slate-200 px-2 outline-none focus:border-[#7CB8D8]"
                              {...form.register(`features.${index}.key`)}
                            />
                          </label>

                          <div className="flex items-end gap-2">
                            <label className="flex flex-1 flex-col gap-1 text-xs">
                              <span className="text-slate-500">Value</span>
                              <input
                                type="text"
                                className="h-9 rounded-lg border border-slate-200 px-2 outline-none focus:border-[#7CB8D8]"
                                {...form.register(`features.${index}.value`)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => featuresArray.remove(index)}
                              className="h-9 rounded-lg border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                    className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
                  >
                    {createPlanMutation.isPending || updatePlanMutation.isPending
                      ? 'Salvando...'
                      : editingPlanId
                        ? 'Salvar alteracoes'
                        : 'Criar plano'}
                  </button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </section>
  )
}
