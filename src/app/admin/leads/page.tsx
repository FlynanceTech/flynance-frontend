'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAdminLeads } from '@/hooks/query/useAdmin'
import toast from 'react-hot-toast'
import { useLocale, useTranslations } from 'next-intl'

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function createLeadFiltersSchema(t: TranslatorFn) {
  return z
    .object({
      search: z.string().optional(),
      createdFrom: z.string().optional(),
      createdTo: z.string().optional(),
      status: z.string().optional(),
    })
    .refine(
      (data) => {
        if (!data.createdFrom || !data.createdTo) return true
        return data.createdFrom <= data.createdTo
      },
      {
        message: t('errors.invalidDateRange'),
        path: ['createdTo'],
      }
    )
}

type LeadFiltersForm = z.infer<ReturnType<typeof createLeadFiltersSchema>>

function formatDate(value: string | null | undefined, locale: string, t: TranslatorFn) {
  if (!value) return t('common.empty')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('common.empty')
  return `${date.toLocaleDateString(locale)} ${date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function formatLeadStatusLabel(status: string | null | undefined, t: TranslatorFn) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase()

  if (!normalized) return t('common.empty')
  if (normalized === 'no_signature_id') return t('status.noSignature')

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

async function copyContact(name: string, email: string, phone: string | null | undefined, t: TranslatorFn) {
  const payload = phone ? `${name} <${email}> | ${phone}` : `${name} <${email}>`
  await navigator.clipboard.writeText(payload)
  toast.success(t('toasts.contactCopied'))
}

export default function AdminLeadsPage() {
  const t = useTranslations('adminLeadsPage')
  const locale = useLocale()
  const [page, setPage] = useState(1)
  const [appliedFilters, setAppliedFilters] = useState<LeadFiltersForm>({
    search: '',
    createdFrom: '',
    createdTo: '',
    status: '',
  })
  const leadFiltersSchema = useMemo(() => createLeadFiltersSchema(t), [t])

  const form = useForm<LeadFiltersForm>({
    resolver: zodResolver(leadFiltersSchema),
    defaultValues: appliedFilters,
  })

  const leadsQuery = useAdminLeads({
    page,
    limit: 20,
    search: appliedFilters.search,
    createdFrom: appliedFilters.createdFrom,
    createdTo: appliedFilters.createdTo,
    status: appliedFilters.status,
  })

  const leads = leadsQuery.data?.leads ?? []
  const meta = leadsQuery.data?.meta

  const totalPages = useMemo(() => {
    if (!meta) return 1
    if (meta.totalPages && meta.totalPages > 0) return meta.totalPages
    return Math.max(1, Math.ceil(meta.total / Math.max(1, meta.limit)))
  }, [meta])

  const onSubmit = form.handleSubmit((values) => {
    setAppliedFilters({
      search: values.search?.trim() ?? '',
      createdFrom: values.createdFrom ?? '',
      createdTo: values.createdTo ?? '',
      status: values.status ?? '',
    })
    setPage(1)
  })

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">{t('filters.title')}</h3>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="text-slate-600">{t('filters.searchLabel')}</span>
            <input
              type="text"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              placeholder={t('filters.searchPlaceholder')}
              {...form.register('search')}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">{t('filters.createdFromLabel')}</span>
            <input
              type="date"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              {...form.register('createdFrom')}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">{t('filters.createdToLabel')}</span>
            <input
              type="date"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              {...form.register('createdTo')}
            />
            <span className="text-xs text-red-400">{form.formState.errors.createdTo?.message}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">{t('filters.statusLabel')}</span>
            <select
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              {...form.register('status')}
            >
              <option value="">{t('filters.statusAll')}</option>
              <option value="no_signature_id">{t('filters.statusNoSignature')}</option>
            </select>
          </label>

          <div className="md:col-span-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                form.reset({ search: '', createdFrom: '', createdTo: '', status: '' })
                setAppliedFilters({ search: '', createdFrom: '', createdTo: '', status: '' })
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t('filters.clear')}
            </button>
            <button
              type="submit"
              className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0]"
            >
              {t('filters.apply')}
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">{t('title')}</h3>

        {leadsQuery.isLoading ? (
          <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-100" />
        ) : leadsQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('states.loadError')}
          </div>
        ) : leads.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            {t('states.empty')}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">{t('table.name')}</th>
                  <th className="pb-2 font-medium">{t('table.email')}</th>
                  <th className="pb-2 font-medium">{t('table.phone')}</th>
                  <th className="pb-2 font-medium">{t('table.createdAt')}</th>
                  <th className="pb-2 font-medium">{t('table.leadStatus')}</th>
                  <th className="pb-2 font-medium">{t('table.latestSubscriptionUpdate')}</th>
                  <th className="pb-2 font-medium text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100">
                    <td className="py-3">{lead.name}</td>
                    <td className="py-3">{lead.email}</td>
                    <td className="py-3">{lead.phone || t('common.empty')}</td>
                    <td className="py-3">{formatDate(lead.createdAt, locale, t)}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {formatLeadStatusLabel(lead.leadStatus, t)}
                      </span>
                    </td>
                    <td className="py-3">{formatDate(lead.latestSubscriptionUpdatedAt, locale, t)}</td>
                    <td className="py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => copyContact(lead.name, lead.email, lead.phone, t)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          {t('table.copyContact')}
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
            {t('pagination.pageOf', { page, totalPages })}
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
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!meta?.hasNext || page >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      </article>
    </section>
  )
}
