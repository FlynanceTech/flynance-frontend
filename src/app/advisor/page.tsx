'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast, { Toaster } from 'react-hot-toast'
import AdvisorGuard from './components/AdvisorGuard'
import Sidebar from '../dashboard/components/Sidebar'
import BottomMenu from '../dashboard/components/buttonMenu'
import AdvisorActingPill from '../dashboard/components/AdvisorActingPill'
import {
  useAdvisorClientInvites,
  useAdvisorClients,
  useCreateAdvisorClientInvite,
  useRevokeAdvisorClientInvite,
  useRevokeAdvisorClientLink,
} from '@/hooks/query/useAdvisor'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { AdvisorPermission } from '@/services/advisor'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { formatCurrency as formatCurrencyByPreference } from '@/utils/formatter'
import { useLocale, useTranslations } from 'next-intl'

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function createInviteSchema(t: TranslatorFn) {
  return z.object({
    emailOptional: z.union([z.literal(''), z.string().email(t('errors.invalidEmail'))]).optional(),
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
    permission: z.enum(['READ_ONLY', 'READ_WRITE']),
  })
}

type InviteFormValues = z.infer<ReturnType<typeof createInviteSchema>>

function formatDate(value: string | null | undefined, locale: string, t: TranslatorFn) {
  if (!value) return t('common.empty')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('common.empty')
  return date.toLocaleDateString(locale)
}

function formatCurrency(value?: number | null) {
  return formatCurrencyByPreference(Number(value ?? 0))
}

function permissionLabel(value: AdvisorPermission, t: TranslatorFn) {
  return value === 'READ_ONLY' ? t('permissions.readOnly') : t('permissions.readWrite')
}

function statusLabel(value: string, t: TranslatorFn) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'PENDING') return t('status.pending')
  if (normalized === 'REVOKED') return t('status.revoked')
  return t('status.active')
}

function statusBadgeClass(value: string) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (normalized === 'REVOKED') return 'bg-red-100 text-red-700'
  return 'bg-emerald-100 text-emerald-700'
}

function inviteStatusLabel(value: string, t: TranslatorFn) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'EXPIRED') return t('inviteStatus.expired')
  if (normalized === 'EXHAUSTED') return t('inviteStatus.exhausted')
  if (normalized === 'REVOKED') return t('inviteStatus.revoked')
  return t('inviteStatus.active')
}

function inviteStatusBadgeClass(value: string) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'EXPIRED') return 'bg-amber-100 text-amber-700'
  if (normalized === 'EXHAUSTED') return 'bg-slate-200 text-slate-700'
  if (normalized === 'REVOKED') return 'bg-red-100 text-red-700'
  return 'bg-emerald-100 text-emerald-700'
}

async function copyToClipboard(text: string, t: TranslatorFn) {
  await navigator.clipboard.writeText(text)
  toast.success(t('toasts.linkCopied'))
}

export default function AdvisorPage() {
  const t = useTranslations('advisorPage')
  const locale = useLocale()
  const router = useRouter()
  const [clientsPage, setClientsPage] = useState(1)
  const [invitesPage, setInvitesPage] = useState(1)
  const [generatedLink, setGeneratedLink] = useState('')
  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false)

  const setActingClient = useAdvisorActing((s) => s.setActingClient)

  const clientsQuery = useAdvisorClients({ page: clientsPage, limit: 20 })
  const invitesQuery = useAdvisorClientInvites({ page: invitesPage, limit: 20 })
  const createInviteMutation = useCreateAdvisorClientInvite()
  const revokeInviteMutation = useRevokeAdvisorClientInvite()
  const revokeClientMutation = useRevokeAdvisorClientLink()
  const inviteSchema = useMemo(() => createInviteSchema(t), [t])

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      emailOptional: '',
      expiresInDays: 7,
      maxUses: 1,
      permission: 'READ_WRITE',
    },
  })

  const clients = clientsQuery.data?.clients ?? []
  const clientsMeta = clientsQuery.data?.meta
  const invites = invitesQuery.data?.invites ?? []
  const invitesMeta = invitesQuery.data?.meta
  const clientsTotalPages = useMemo(() => {
    if (!clientsMeta) return 1
    return Math.max(1, clientsMeta.totalPages || Math.ceil(clientsMeta.total / Math.max(1, clientsMeta.limit)))
  }, [clientsMeta])
  const invitesTotalPages = useMemo(() => {
    if (!invitesMeta) return 1
    return Math.max(1, invitesMeta.totalPages || Math.ceil(invitesMeta.total / Math.max(1, invitesMeta.limit)))
  }, [invitesMeta])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await createInviteMutation.mutateAsync({
        emailOptional: values.emailOptional || undefined,
        expiresInDays: values.expiresInDays,
        maxUses: values.maxUses,
        permission: values.permission,
      })
      setGeneratedLink(response.inviteUrl || '')
      setInviteDrawerOpen(false)
      setInvitesPage(1)
      form.reset({
        emailOptional: '',
        expiresInDays: 7,
        maxUses: 1,
        permission: 'READ_WRITE',
      })
    } catch {
      // erro ja tratado no onError da mutation
    }
  })

  return (
    <AdvisorGuard>
      <main className="relative h-screen w-full gap-8 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors lg:flex lg:py-8 lg:pl-8">
        <AdvisorActingPill />
        <aside className="hidden lg:flex">
          <Sidebar />
        </aside>

        <aside className="flex lg:hidden">
          <BottomMenu />
        </aside>

        <section className="w-full overflow-y-auto px-4 pb-28 pt-6 md:px-6 lg:pr-8 lg:pb-6 lg:pt-0">
          <div className="mx-auto w-full max-w-7xl space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-[#333C4D]">{t('header.title')}</h1>
                <p className="text-sm text-slate-600">
                  {t('header.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInviteDrawerOpen(true)}
                  className="rounded-full bg-[#4F98C2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f86b0]"
                >
                  {t('header.inviteClient')}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {t('header.goToDashboard')}
                </button>
              </div>
            </div>
          </article>

          {generatedLink && (
            <article className="rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-5">
              <h2 className="text-base font-semibold text-[#333C4D]">{t('latestInvite.title')}</h2>
              <p className="mt-2 break-all text-sm text-slate-700">{generatedLink}</p>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedLink, t)}
                className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('latestInvite.copyLink')}
              </button>
            </article>
          )}

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-[#333C4D]">{t('clients.title')}</h2>

            {clientsQuery.isLoading ? (
              <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-100" />
            ) : clientsQuery.isError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {clientsQuery.error instanceof Error
                  ? clientsQuery.error.message
                  : t('clients.loadError')}
              </div>
            ) : clients.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                {t('clients.empty')}
              </div>
            ) : (
              <div className="mt-4">
                <div className="space-y-3 md:hidden">
                  {clients.map((client) => (
                    <article key={client.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-[#333C4D]">{client.name}</h3>
                          <p className="mt-0.5 break-all text-xs text-slate-500">
                            {client.email || t('common.empty')}
                          </p>
                        </div>
                        <span
                          className={[
                            'inline-flex rounded-full px-2 py-1 text-[11px] font-semibold',
                            statusBadgeClass(client.status),
                          ].join(' ')}
                        >
                          {statusLabel(client.status, t)}
                        </span>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <dt className="text-slate-500">{t('clients.fields.permission')}</dt>
                          <dd className="font-medium text-slate-700">
                            {permissionLabel(client.permission, t)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{t('clients.fields.connectedAt')}</dt>
                          <dd className="font-medium text-slate-700">
                            {formatDate(client.createdAt, locale, t)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{t('clients.fields.income')}</dt>
                          <dd className="font-medium text-emerald-700">{formatCurrency(client.income)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{t('clients.fields.expense')}</dt>
                          <dd className="font-medium text-red-700">{formatCurrency(client.expense)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{t('clients.fields.balance')}</dt>
                          <dd className="font-medium text-slate-700">{formatCurrency(client.balance)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{t('clients.fields.score')}</dt>
                          <dd className="font-medium text-slate-700">
                            {client.score == null ? t('common.empty') : client.score}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActingClient({
                              id: client.clientUserId,
                              name: client.name,
                              email: client.email,
                              permission: client.permission,
                            })
                            router.push('/dashboard')
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          {t('clients.actions.enterDashboard')}
                        </button>
                        <button
                          type="button"
                          disabled={revokeClientMutation.isPending}
                          onClick={() => revokeClientMutation.mutate(client.id)}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-60"
                        >
                          {t('clients.actions.revoke')}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-2 font-medium">{t('clients.table.name')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.email')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.permission')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.status')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.income')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.expense')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.balance')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.score')}</th>
                        <th className="pb-2 font-medium">{t('clients.table.connectedAt')}</th>
                        <th className="pb-2 font-medium text-right">{t('clients.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id} className="border-b border-slate-100">
                          <td className="py-3">{client.name}</td>
                          <td className="py-3">{client.email || t('common.empty')}</td>
                          <td className="py-3">{permissionLabel(client.permission, t)}</td>
                          <td className="py-3">
                            <span
                              className={[
                                'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                                statusBadgeClass(client.status),
                              ].join(' ')}
                            >
                              {statusLabel(client.status, t)}
                            </span>
                          </td>
                          <td className="py-3">{formatCurrency(client.income)}</td>
                          <td className="py-3">{formatCurrency(client.expense)}</td>
                          <td className="py-3">{formatCurrency(client.balance)}</td>
                          <td className="py-3">{client.score == null ? t('common.empty') : client.score}</td>
                          <td className="py-3">{formatDate(client.createdAt, locale, t)}</td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActingClient({
                                    id: client.clientUserId,
                                    name: client.name,
                                    email: client.email,
                                    permission: client.permission,
                                  })
                                  router.push('/dashboard')
                                }}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                              >
                                {t('clients.actions.enterDashboard')}
                              </button>
                              <button
                                type="button"
                                disabled={revokeClientMutation.isPending}
                                onClick={() => revokeClientMutation.mutate(client.id)}
                                className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-60"
                              >
                                {t('clients.actions.revoke')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {t('clients.pagination.pageOf', { page: clientsPage, totalPages: clientsTotalPages })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClientsPage((prev) => Math.max(1, prev - 1))}
                  disabled={clientsPage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  {t('pagination.previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setClientsPage((prev) => Math.min(clientsTotalPages, prev + 1))}
                  disabled={!clientsMeta?.hasNext || clientsPage >= clientsTotalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-[#333C4D]">{t('invites.title')}</h2>

            {invitesQuery.isLoading ? (
              <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
            ) : invitesQuery.isError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {invitesQuery.error instanceof Error
                  ? invitesQuery.error.message
                  : t('invites.loadError')}
              </div>
            ) : invites.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                {t('invites.empty')}
              </div>
            ) : (
              <div className="mt-4">
                <div className="space-y-3 md:hidden">
                  {invites.map((invite) => (
                    <article key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-all text-sm font-medium text-[#333C4D]">
                          {invite.emailOptional || t('common.empty')}
                        </p>
                        <span
                          className={[
                            'inline-flex rounded-full px-2 py-1 text-[11px] font-semibold',
                            inviteStatusBadgeClass(invite.status),
                          ].join(' ')}
                        >
                          {inviteStatusLabel(invite.status, t)}
                        </span>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <dt className="text-slate-500">{t('invites.fields.expiresAt')}</dt>
                          <dd className="font-medium text-slate-700">
                            {formatDate(invite.expiresAt, locale, t)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">{t('invites.fields.uses')}</dt>
                          <dd className="font-medium text-slate-700">
                            {invite.usedCount}/{invite.maxUses}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-slate-500">{t('invites.fields.permission')}</dt>
                          <dd className="font-medium text-slate-700">
                            {permissionLabel(invite.permission, t)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          disabled={invite.status !== 'ACTIVE' || revokeInviteMutation.isPending}
                          onClick={() => revokeInviteMutation.mutate(invite.id)}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-60"
                        >
                          {t('invites.actions.revoke')}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-2 font-medium">{t('invites.table.email')}</th>
                        <th className="pb-2 font-medium">{t('invites.table.expiresAt')}</th>
                        <th className="pb-2 font-medium">{t('invites.table.uses')}</th>
                        <th className="pb-2 font-medium">{t('invites.table.permission')}</th>
                        <th className="pb-2 font-medium">{t('invites.table.status')}</th>
                        <th className="pb-2 font-medium text-right">{t('invites.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((invite) => (
                        <tr key={invite.id} className="border-b border-slate-100">
                          <td className="py-3">{invite.emailOptional || t('common.empty')}</td>
                          <td className="py-3">{formatDate(invite.expiresAt, locale, t)}</td>
                          <td className="py-3">
                            {invite.usedCount}/{invite.maxUses}
                          </td>
                          <td className="py-3">{permissionLabel(invite.permission, t)}</td>
                          <td className="py-3">
                            <span
                              className={[
                                'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                                inviteStatusBadgeClass(invite.status),
                              ].join(' ')}
                            >
                              {inviteStatusLabel(invite.status, t)}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              disabled={invite.status !== 'ACTIVE' || revokeInviteMutation.isPending}
                              onClick={() => revokeInviteMutation.mutate(invite.id)}
                              className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-60"
                            >
                              {t('invites.actions.revoke')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {t('invites.pagination.pageOf', { page: invitesPage, totalPages: invitesTotalPages })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInvitesPage((prev) => Math.max(1, prev - 1))}
                  disabled={invitesPage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  {t('pagination.previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setInvitesPage((prev) => Math.min(invitesTotalPages, prev + 1))}
                  disabled={!invitesMeta?.hasNext || invitesPage >= invitesTotalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          </article>
          </div>
        </section>
      </main>

      <Drawer open={inviteDrawerOpen} onOpenChange={setInviteDrawerOpen}>
        <DrawerContent className="mx-auto w-full max-w-2xl rounded-t-2xl border-slate-200 bg-white">
          <DrawerHeader className="px-5 pt-5">
            <DrawerTitle className="text-[#333C4D]">{t('drawer.title')}</DrawerTitle>
            <DrawerDescription>
              {t('drawer.description')}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={onSubmit} className="grid gap-3 px-5 pb-5 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-600">{t('drawer.emailLabel')}</span>
              <input
                type="email"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                placeholder={t('drawer.emailPlaceholder')}
                {...form.register('emailOptional')}
              />
              <span className="text-xs text-red-400">{form.formState.errors.emailOptional?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('drawer.expiresInDaysLabel')}</span>
              <input
                type="number"
                min={1}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('expiresInDays')}
              />
              <span className="text-xs text-red-400">{form.formState.errors.expiresInDays?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('drawer.maxUsesLabel')}</span>
              <input
                type="number"
                min={1}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('maxUses')}
              />
              <span className="text-xs text-red-400">{form.formState.errors.maxUses?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-600">{t('drawer.permissionLabel')}</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('permission')}
              >
                <option value="READ_WRITE">{t('permissions.readWrite')}</option>
                <option value="READ_ONLY">{t('permissions.readOnly')}</option>
              </select>
              <span className="text-xs text-slate-500">
                {t('drawer.permissionHint')}
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2 md:col-span-2">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {t('drawer.cancel')}
                </button>
              </DrawerClose>
              <button
                type="submit"
                disabled={createInviteMutation.isPending}
                className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
              >
                {createInviteMutation.isPending ? t('drawer.generating') : t('drawer.generate')}
              </button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
      <Toaster />
    </AdvisorGuard>
  )
}
