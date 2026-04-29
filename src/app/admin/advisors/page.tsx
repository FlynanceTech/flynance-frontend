'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleHelp } from 'lucide-react'
import {
  useAdvisorInvites,
  useCreateAdvisorInvite,
  useRevokeAdvisorInvite,
} from '@/hooks/query/useAdmin'
import toast from 'react-hot-toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLocale, useTranslations } from 'next-intl'

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function createInviteSchema(t: TranslatorFn) {
  return z.object({
    email: z.union([z.literal(''), z.string().email(t('errors.invalidEmail'))]).optional(),
    expiresInDays: z.coerce
      .number()
      .int()
      .min(1, t('errors.minDays'))
      .max(365, t('errors.maxDays')),
    maxUses: z.coerce
      .number()
      .int()
      .min(1, t('errors.minUses'))
      .max(1000, t('errors.maxUses')),
    defaultPermission: z.enum(['READ_ONLY', 'READ_WRITE']),
  })
}

type InviteFormValues = z.infer<ReturnType<typeof createInviteSchema>>

function formatDate(value: string | null | undefined, locale: string, t: TranslatorFn) {
  if (!value) return t('common.empty')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return t('common.empty')
  return parsed.toLocaleDateString(locale)
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-amber-100 text-amber-700',
    revoked: 'bg-red-100 text-red-700',
    used: 'bg-slate-200 text-slate-700',
  }
  return map[status] ?? 'bg-slate-200 text-slate-700'
}

function statusLabel(status: string, t: TranslatorFn) {
  const map: Record<string, string> = {
    active: t('status.active'),
    expired: t('status.expired'),
    revoked: t('status.revoked'),
    used: t('status.used'),
  }
  return map[status] ?? status
}

function LabelWithTooltip({ label, tip, helpPrefix }: { label: string; tip: string; helpPrefix: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${helpPrefix}: ${label}`}
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <CircleHelp size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
          {tip}
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

export default function AdminAdvisorsPage() {
  const t = useTranslations('adminAdvisorsPage')
  const locale = useLocale()
  const [page, setPage] = useState(1)
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('')
  const inviteSchema = useMemo(() => createInviteSchema(t), [t])

  const invitesQuery = useAdvisorInvites({ page, limit: 10 })
  const createInviteMutation = useCreateAdvisorInvite()
  const revokeInviteMutation = useRevokeAdvisorInvite()

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      expiresInDays: 7,
      maxUses: 1,
      defaultPermission: 'READ_WRITE',
    },
  })

  const invites = invitesQuery.data?.invites ?? []
  const meta = invitesQuery.data?.meta
  const totalPages = useMemo(() => {
    if (!meta) return 1
    return Math.max(1, Math.ceil(meta.total / Math.max(1, meta.limit)))
  }, [meta])

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await createInviteMutation.mutateAsync({
      emailOptional: values.email || undefined,
      expiresInDays: values.expiresInDays,
      maxUses: values.maxUses,
      defaultPermission: values.defaultPermission,
    })

    setGeneratedInviteUrl(response.inviteUrl || response.invite.inviteUrl || '')
  })

  return (
    <TooltipProvider delayDuration={150}>
      <section className="space-y-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#333C4D]">{t('form.title')}</h3>

          <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-5">
            <label className="flex flex-col gap-1 text-sm">
              <LabelWithTooltip
                label={t('form.emailLabel')}
                tip={t('form.emailTip')}
                helpPrefix={t('common.help')}
              />
              <input
                type="email"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                placeholder={t('form.emailPlaceholder')}
                {...form.register('email')}
              />
              <span className="text-xs text-red-400">{form.formState.errors.email?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <LabelWithTooltip
                label={t('form.expiresInDaysLabel')}
                tip={t('form.expiresInDaysTip')}
                helpPrefix={t('common.help')}
              />
              <input
                type="number"
                min={1}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('expiresInDays')}
              />
              <span className="text-xs text-red-400">
                {form.formState.errors.expiresInDays?.message}
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <LabelWithTooltip
                label={t('form.maxUsesLabel')}
                tip={t('form.maxUsesTip')}
                helpPrefix={t('common.help')}
              />
              <input
                type="number"
                min={1}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('maxUses')}
              />
              <span className="text-xs text-red-400">{form.formState.errors.maxUses?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <LabelWithTooltip
                label={t('form.permissionLabel')}
                tip={t('form.permissionTip')}
                helpPrefix={t('common.help')}
              />
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('defaultPermission')}
              >
                <option value="READ_WRITE">{t('permissions.readWrite')}</option>
                <option value="READ_ONLY">{t('permissions.readOnly')}</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={createInviteMutation.isPending}
                className="h-10 w-full rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
              >
                {createInviteMutation.isPending ? t('form.generating') : t('form.generate')}
              </button>
            </div>
          </form>

          {generatedInviteUrl && (
            <div className="mt-4 rounded-xl border border-[#D7EAF5] bg-[#F3FAFF] p-3">
              <p className="text-sm text-slate-700 break-all">{generatedInviteUrl}</p>
              <button
                type="button"
                onClick={async () => {
                  await copyText(generatedInviteUrl)
                  toast.success(t('toasts.linkCopied'))
                }}
                className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('form.copyLink')}
              </button>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#333C4D]">{t('list.title')}</h3>

        {invitesQuery.isLoading ? (
          <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-100" />
        ) : invites.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            {t('list.empty')}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">{t('table.email')}</th>
                  <th className="pb-2 font-medium">{t('table.expiresAt')}</th>
                  <th className="pb-2 font-medium">{t('table.uses')}</th>
                  <th className="pb-2 font-medium">{t('table.permission')}</th>
                  <th className="pb-2 font-medium">{t('table.status')}</th>
                  <th className="pb-2 font-medium text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-slate-100">
                    <td className="py-3">{invite.email || t('common.empty')}</td>
                    <td className="py-3">{formatDate(invite.expiresAt, locale, t)}</td>
                    <td className="py-3">
                      {invite.usedCount}/{invite.maxUses}
                    </td>
                    <td className="py-3">
                      {invite.defaultPermission === 'READ_ONLY'
                        ? t('permissions.readOnly')
                        : t('permissions.readWrite')}
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          statusBadge(invite.status),
                        ].join(' ')}
                      >
                        {statusLabel(invite.status, t)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const value = invite.inviteUrl || invite.token || invite.id
                            await copyText(value)
                            toast.success(t('toasts.inviteCopied'))
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          {t('table.copy')}
                        </button>
                        <button
                          type="button"
                          disabled={invite.status !== 'active' || revokeInviteMutation.isPending}
                          onClick={() => revokeInviteMutation.mutate(invite.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50"
                        >
                          {t('table.revoke')}
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
    </TooltipProvider>
  )
}
