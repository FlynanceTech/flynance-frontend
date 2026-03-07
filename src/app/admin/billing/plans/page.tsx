'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useLocale, useTranslations } from 'next-intl'
import {
  useAdminPlan,
  useAdminPlans,
  useCreateAdminPlan,
  useDeleteAdminPlan,
  useUpdateAdminPlan,
} from '@/hooks/query/useAdmin'
import type { AdminPlan } from '@/services/admin'

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function createFeatureSchema(t: TranslatorFn) {
  return z.object({
    label: z.string().trim().min(1, t('errors.featureLabelRequired')),
    key: z.string().optional(),
    value: z.string().optional(),
  })
}

function createPlanSchema(t: TranslatorFn) {
  return z.object({
    name: z.string().trim().min(2, t('errors.planNameMin')),
    slug: z.string().trim().min(2, t('errors.planSlugMin')),
    description: z.string().optional(),
    priceCents: z.coerce.number().int().min(0, t('errors.priceMin')),
    currency: z
      .string()
      .trim()
      .min(3, t('errors.invalidCurrency'))
      .max(3, t('errors.invalidCurrency'))
      .default('BRL'),
    priceId: z.string().optional(),
    installmentPriceId: z.string().optional(),
    yearlyPriceId: z.string().optional(),
    allowCancel: z.boolean().default(true),
    commitmentMonths: z
      .union([
        z.literal(''),
        z
          .coerce
          .number()
          .int()
          .min(1, t('errors.commitmentMin'))
          .max(120, t('errors.commitmentMax')),
      ])
      .optional(),
    period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).default('MONTHLY'),
    isActive: z.boolean().default(true),
    isPublic: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    trialDays: z
      .coerce
      .number()
      .int()
      .min(0, t('errors.trialDaysMin'))
      .max(365, t('errors.trialDaysMax'))
      .default(0),
    features: z.array(createFeatureSchema(t)).default([]),
  })
}

type PlanFormValues = z.input<ReturnType<typeof createPlanSchema>>
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

function formatCurrencyFromCents(value: number, currency: string, locale: string) {
  const resolvedCurrency = (currency || 'BRL').toUpperCase()
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: resolvedCurrency,
    }).format((Number(value) || 0) / 100)
  } catch {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'BRL',
    }).format((Number(value) || 0) / 100)
  }
}

function formatDate(value: string | null | undefined, locale: string, t: TranslatorFn) {
  if (!value) return t('common.empty')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return t('common.empty')
  return parsed.toLocaleDateString(locale)
}

function mapFilterToBoolean(value: BoolFilter): boolean | undefined {
  if (value === 'all') return undefined
  return value === 'true'
}

function periodLabel(period: string, t: TranslatorFn) {
  const map: Record<string, string> = {
    WEEKLY: t('period.weekly'),
    MONTHLY: t('period.monthly'),
    YEARLY: t('period.yearly'),
  }
  return map[period] ?? period
}

export default function AdminBillingPlansPage() {
  const t = useTranslations('adminBillingPlansPage')
  const locale = useLocale()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState<BoolFilter>('all')
  const [isPublicFilter, setIsPublicFilter] = useState<BoolFilter>('all')
  const [appliedIsActive, setAppliedIsActive] = useState<BoolFilter>('all')
  const [appliedIsPublic, setAppliedIsPublic] = useState<BoolFilter>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [cachedRows, setCachedRows] = useState<AdminPlan[]>([])
  const [cachedPaging, setCachedPaging] = useState<{
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
  } | null>(null)
  const lastErrorToastRef = useRef('')

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
  const planSchema = useMemo(() => createPlanSchema(t), [t])

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: defaultValues(),
  })

  const featuresArray = useFieldArray({
    control: form.control,
    name: 'features',
  })

  const responseRows = plansQuery.data?.rows ?? plansQuery.data?.plans ?? []
  const responsePage = plansQuery.data?.page ?? plansQuery.data?.meta?.page ?? page
  const responseLimit = plansQuery.data?.limit ?? plansQuery.data?.meta?.limit ?? 20
  const responseTotal = plansQuery.data?.total ?? plansQuery.data?.meta?.total ?? responseRows.length
  const responseTotalPages =
    plansQuery.data?.totalPages ??
    plansQuery.data?.meta?.totalPages ??
    Math.max(1, Math.ceil(responseTotal / Math.max(1, responseLimit)))
  const responseHasNext =
    plansQuery.data?.meta?.hasNext ?? responsePage < Math.max(1, responseTotalPages)

  useEffect(() => {
    if (!plansQuery.data || plansQuery.isError) return

    setCachedRows(responseRows)
    setCachedPaging({
      page: responsePage,
      limit: responseLimit,
      total: responseTotal,
      totalPages: Math.max(1, responseTotalPages),
      hasNext: responseHasNext,
    })
  }, [
    plansQuery.data,
    plansQuery.isError,
    responseRows,
    responsePage,
    responseLimit,
    responseTotal,
    responseTotalPages,
    responseHasNext,
  ])

  const errorMessage =
    plansQuery.isError && plansQuery.error instanceof Error
      ? plansQuery.error.message
      : plansQuery.isError
      ? t('states.loadError')
      : ''

  useEffect(() => {
    if (!plansQuery.isError) {
      lastErrorToastRef.current = ''
      return
    }

    const normalized = errorMessage.toLowerCase()
    if (normalized.includes('sessao expirou') || normalized.includes('session expired')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
      router.replace('/login?next=%2Fadmin%2Fbilling%2Fplans')
      return
    }

    if (
      cachedRows.length > 0 &&
      lastErrorToastRef.current !== errorMessage &&
      (normalized.includes('nao foi possivel carregar os planos') ||
        normalized.includes('could not load plans') ||
        normalized.includes('servidor') ||
        normalized.includes('server'))
    ) {
      toast.error(errorMessage)
      lastErrorToastRef.current = errorMessage
    }
  }, [plansQuery.isError, errorMessage, cachedRows.length, router])

  const normalizedErrorMessage = errorMessage.trim().toLowerCase()
  const isAccessRestricted =
    normalizedErrorMessage === 'acesso restrito.' || normalizedErrorMessage === 'access restricted.'
  const hasCachedRows = cachedRows.length > 0
  const rowsToRender = plansQuery.isError && hasCachedRows ? cachedRows : responseRows
  const pageToRender = plansQuery.isError && hasCachedRows ? cachedPaging?.page ?? page : responsePage
  const totalToRender =
    plansQuery.isError && hasCachedRows ? cachedPaging?.total ?? rowsToRender.length : responseTotal
  const totalPagesToRender =
    plansQuery.isError && hasCachedRows
      ? cachedPaging?.totalPages ?? Math.max(1, responseTotalPages)
      : Math.max(1, responseTotalPages)
  const hasNextToRender =
    plansQuery.isError && hasCachedRows
      ? cachedPaging?.hasNext ?? pageToRender < totalPagesToRender
      : responseHasNext

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
        ? t('confirm.hardDelete')
        : t('confirm.delete')
    )
    if (!confirmed) return

    await deletePlanMutation.mutateAsync({ planId, hardDelete })
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-slate-600">{t('filters.searchLabel')}</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">{t('filters.activeLabel')}</span>
            <select
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value as BoolFilter)}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            >
              <option value="all">{t('filters.all')}</option>
              <option value="true">{t('filters.activeOnly')}</option>
              <option value="false">{t('filters.inactiveOnly')}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">{t('filters.publicLabel')}</span>
            <select
              value={isPublicFilter}
              onChange={(e) => setIsPublicFilter(e.target.value as BoolFilter)}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            >
              <option value="all">{t('filters.all')}</option>
              <option value="true">{t('filters.publicOnly')}</option>
              <option value="false">{t('filters.privateOnly')}</option>
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
              {t('filters.apply')}
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
              {t('filters.clear')}
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {t('filters.createPlan')}
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">{t('list.title')}</h3>

        {plansQuery.isLoading ? (
          <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-100" />
        ) : plansQuery.isError && (!hasCachedRows || isAccessRestricted) ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage || t('states.loadError')}
          </div>
        ) : !plansQuery.isLoading && rowsToRender.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            {t('states.empty')}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            {plansQuery.isError && hasCachedRows && !isAccessRestricted && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                {t('states.showingCached')}
              </div>
            )}
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">{t('table.name')}</th>
                  <th className="pb-2 font-medium">{t('table.slug')}</th>
                  <th className="pb-2 font-medium">{t('table.price')}</th>
                  <th className="pb-2 font-medium">{t('table.period')}</th>
                  <th className="pb-2 font-medium">{t('table.active')}</th>
                  <th className="pb-2 font-medium">{t('table.public')}</th>
                  <th className="pb-2 font-medium">{t('table.featured')}</th>
                  <th className="pb-2 font-medium text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rowsToRender.map((plan) => (
                  <tr key={plan.id} className="border-b border-slate-100">
                    <td className="py-3">{plan.name}</td>
                    <td className="py-3 text-slate-600">{plan.slug}</td>
                    <td className="py-3">{formatCurrencyFromCents(plan.priceCents, plan.currency, locale)}</td>
                    <td className="py-3">{periodLabel(plan.period, t)}</td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {plan.isActive ? t('common.yes') : t('common.no')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          plan.isPublic ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {plan.isPublic ? t('common.yes') : t('common.no')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          plan.isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {plan.isFeatured ? t('common.yes') : t('common.no')}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(plan.id)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          {t('table.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(plan.id, false)}
                          disabled={deletePlanMutation.isPending}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50"
                        >
                          {t('table.delete')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(plan.id, true)}
                          disabled={deletePlanMutation.isPending}
                          className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {t('table.hardDelete')}
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
            {t('pagination.pageOf', { page: pageToRender, totalPages: totalPagesToRender })}
            {` · ${t('pagination.total', { total: totalToRender })}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              {t('pagination.previous')}
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPagesToRender, prev + 1))}
              disabled={!hasNextToRender || page >= totalPagesToRender}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      </article>

      <Dialog open={isModalOpen} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-lg font-semibold text-[#333C4D]">
              {editingPlanId ? t('modal.editTitle') : t('modal.createTitle')}
            </DialogTitle>

            {editingPlanId && planDetailQuery.isLoading ? (
              <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-100" />
            ) : editingPlanId && planDetailQuery.isError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {planDetailQuery.error instanceof Error
                  ? planDetailQuery.error.message
                  : t('modal.loadDetailsError')}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  <span className="text-slate-600">{t('fields.name')}</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('name')}
                  />
                  <span className="text-xs text-red-400">{form.formState.errors.name?.message}</span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.slug')}</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('slug')}
                  />
                  <span className="text-xs text-red-400">{form.formState.errors.slug?.message}</span>
                </label>

                <label className="flex flex-col gap-1 text-sm md:col-span-3">
                  <span className="text-slate-600">{t('fields.description')}</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('description')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.priceCents')}</span>
                  <input
                    type="number"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('priceCents')}
                  />
                  <span className="text-xs text-red-400">
                    {form.formState.errors.priceCents?.message}
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.currency')}</span>
                  <input
                    type="text"
                    maxLength={3}
                    className="h-10 rounded-xl border border-slate-200 px-3 uppercase outline-none focus:border-[#7CB8D8]"
                    {...form.register('currency')}
                  />
                  <span className="text-xs text-red-400">{form.formState.errors.currency?.message}</span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.period')}</span>
                  <select
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('period')}
                  >
                    <option value="WEEKLY">{t('period.weekly')}</option>
                    <option value="MONTHLY">{t('period.monthly')}</option>
                    <option value="YEARLY">{t('period.yearly')}</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.priceId')}</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('priceId')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.installmentPriceId')}</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('installmentPriceId')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.yearlyPriceId')}</span>
                  <input
                    type="text"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('yearlyPriceId')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.commitmentMonths')}</span>
                  <input
                    type="number"
                    min={1}
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('commitmentMonths')}
                  />
                  <span className="text-xs text-red-400">
                    {form.formState.errors.commitmentMonths?.message}
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('fields.trialDays')}</span>
                  <input
                    type="number"
                    min={0}
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...form.register('trialDays')}
                  />
                  <span className="text-xs text-red-400">{form.formState.errors.trialDays?.message}</span>
                </label>

                <div className="md:col-span-3 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('allowCancel')} />
                    {t('fields.allowCancel')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('isActive')} />
                    {t('fields.isActive')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('isPublic')} />
                    {t('fields.isPublic')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4" {...form.register('isFeatured')} />
                    {t('fields.isFeatured')}
                  </label>
                  <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-1">
                    {t('fields.createdAt')}: {formatDate(planDetailQuery.data?.createdAt, locale, t)}
                  </p>
                </div>

                <div className="md:col-span-3 rounded-xl border border-slate-200 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#333C4D]">{t('features.title')}</h4>
                    <button
                      type="button"
                      onClick={() => featuresArray.append({ label: '', key: '', value: '' })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      {t('features.add')}
                    </button>
                  </div>

                  {featuresArray.fields.length === 0 ? (
                    <p className="text-xs text-slate-500">{t('features.empty')}</p>
                  ) : (
                    <div className="space-y-2">
                      {featuresArray.fields.map((field, index) => (
                        <div key={field.id} className="grid gap-2 md:grid-cols-3">
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="text-slate-500">{t('features.label')}</span>
                            <input
                              type="text"
                              className="h-9 rounded-lg border border-slate-200 px-2 outline-none focus:border-[#7CB8D8]"
                              {...form.register(`features.${index}.label`)}
                            />
                            <span className="text-red-400">
                              {form.formState.errors.features?.[index]?.label?.message}
                            </span>
                          </label>

                          <label className="flex flex-col gap-1 text-xs">
                            <span className="text-slate-500">{t('features.key')}</span>
                            <input
                              type="text"
                              className="h-9 rounded-lg border border-slate-200 px-2 outline-none focus:border-[#7CB8D8]"
                              {...form.register(`features.${index}.key`)}
                            />
                          </label>

                          <div className="flex items-end gap-2">
                            <label className="flex flex-1 flex-col gap-1 text-xs">
                              <span className="text-slate-500">{t('features.value')}</span>
                              <input
                                type="text"
                                className="h-9 rounded-lg border border-slate-200 px-2 outline-none focus:border-[#7CB8D8]"
                                {...form.register(`features.${index}.value`)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => featuresArray.remove(index)}
                              className="h-9 rounded-lg border border-red-200 px-2 text-xs text-red-400 hover:bg-red-50"
                            >
                              {t('features.remove')}
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
                    {t('modal.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                    className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
                  >
                    {createPlanMutation.isPending || updatePlanMutation.isPending
                      ? t('modal.saving')
                      : editingPlanId
                        ? t('modal.saveChanges')
                        : t('modal.create')}
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

