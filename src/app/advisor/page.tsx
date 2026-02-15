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

const inviteSchema = z.object({
  emailOptional: z.union([z.literal(''), z.string().email('E-mail invalido')]).optional(),
  expiresInDays: z.coerce.number().int().min(1, 'Minimo 1 dia').max(365),
  maxUses: z.coerce.number().int().min(1, 'Minimo 1 uso').max(1000),
  permission: z.enum(['READ_ONLY', 'READ_WRITE']),
})

type InviteFormValues = z.infer<typeof inviteSchema>

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value ?? 0)
  )
}

function permissionLabel(value: AdvisorPermission) {
  return value === 'READ_ONLY' ? 'Somente leitura' : 'Leitura e escrita'
}

function statusLabel(value: string) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'PENDING') return 'Pendente'
  if (normalized === 'REVOKED') return 'Revogado'
  return 'Ativo'
}

function statusBadgeClass(value: string) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (normalized === 'REVOKED') return 'bg-red-100 text-red-700'
  return 'bg-emerald-100 text-emerald-700'
}

function inviteStatusLabel(value: string) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'EXPIRED') return 'Expirado'
  if (normalized === 'EXHAUSTED') return 'Esgotado'
  if (normalized === 'REVOKED') return 'Revogado'
  return 'Ativo'
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

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Link copiado.')
}

export default function AdvisorPage() {
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
      <main className="lg:py-8 lg:pl-8 h-screen w-full lg:flex gap-8 relative bg-[#F7F8FA]">
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
                <h1 className="text-lg font-semibold text-[#333C4D]">Painel do Advisor</h1>
                <p className="text-sm text-slate-600">
                  Convide clientes e selecione um cliente para atuar no dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInviteDrawerOpen(true)}
                  className="rounded-full bg-[#4F98C2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3f86b0]"
                >
                  Convidar cliente
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Ir para dashboard
                </button>
              </div>
            </div>
          </article>

          {generatedLink && (
            <article className="rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-5">
              <h2 className="text-base font-semibold text-[#333C4D]">Ultimo convite gerado</h2>
              <p className="mt-2 break-all text-sm text-slate-700">{generatedLink}</p>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedLink)}
                className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Copiar link
              </button>
            </article>
          )}

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-[#333C4D]">Clientes conectados</h2>

            {clientsQuery.isLoading ? (
              <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-100" />
            ) : clientsQuery.isError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {clientsQuery.error instanceof Error
                  ? clientsQuery.error.message
                  : 'Erro ao carregar clientes conectados.'}
              </div>
            ) : clients.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Voce ainda nao tem clientes conectados.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-2 font-medium">Nome</th>
                      <th className="pb-2 font-medium">E-mail</th>
                      <th className="pb-2 font-medium">Permissao</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Receita</th>
                      <th className="pb-2 font-medium">Despesa</th>
                      <th className="pb-2 font-medium">Saldo</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium">Conectado em</th>
                      <th className="pb-2 font-medium text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="border-b border-slate-100">
                        <td className="py-3">{client.name}</td>
                        <td className="py-3">{client.email || '-'}</td>
                        <td className="py-3">{permissionLabel(client.permission)}</td>
                        <td className="py-3">
                          <span
                            className={[
                              'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                              statusBadgeClass(client.status),
                            ].join(' ')}
                          >
                            {statusLabel(client.status)}
                          </span>
                        </td>
                        <td className="py-3">{formatCurrency(client.income)}</td>
                        <td className="py-3">{formatCurrency(client.expense)}</td>
                        <td className="py-3">{formatCurrency(client.balance)}</td>
                        <td className="py-3">{client.score == null ? '-' : client.score}</td>
                        <td className="py-3">{formatDate(client.createdAt)}</td>
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
                              Entrar no dashboard
                            </button>
                            <button
                              type="button"
                              disabled={revokeClientMutation.isPending}
                              onClick={() => revokeClientMutation.mutate(client.id)}
                              className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              Revogar
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
                Pagina {clientsPage} de {clientsTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClientsPage((prev) => Math.max(1, prev - 1))}
                  disabled={clientsPage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setClientsPage((prev) => Math.min(clientsTotalPages, prev + 1))}
                  disabled={!clientsMeta?.hasNext || clientsPage >= clientsTotalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Proxima
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-[#333C4D]">Convites enviados</h2>

            {invitesQuery.isLoading ? (
              <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
            ) : invitesQuery.isError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {invitesQuery.error instanceof Error
                  ? invitesQuery.error.message
                  : 'Erro ao carregar convites enviados.'}
              </div>
            ) : invites.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Nenhum convite enviado.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-2 font-medium">E-mail</th>
                      <th className="pb-2 font-medium">Expira em</th>
                      <th className="pb-2 font-medium">Usos</th>
                      <th className="pb-2 font-medium">Permissao</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id} className="border-b border-slate-100">
                        <td className="py-3">{invite.emailOptional || '-'}</td>
                        <td className="py-3">{formatDate(invite.expiresAt)}</td>
                        <td className="py-3">
                          {invite.usedCount}/{invite.maxUses}
                        </td>
                        <td className="py-3">{permissionLabel(invite.permission)}</td>
                        <td className="py-3">
                          <span
                            className={[
                              'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                              inviteStatusBadgeClass(invite.status),
                            ].join(' ')}
                          >
                            {inviteStatusLabel(invite.status)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            disabled={invite.status !== 'ACTIVE' || revokeInviteMutation.isPending}
                            onClick={() => revokeInviteMutation.mutate(invite.id)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            Revogar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Pagina {invitesPage} de {invitesTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInvitesPage((prev) => Math.max(1, prev - 1))}
                  disabled={invitesPage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setInvitesPage((prev) => Math.min(invitesTotalPages, prev + 1))}
                  disabled={!invitesMeta?.hasNext || invitesPage >= invitesTotalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Proxima
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
            <DrawerTitle className="text-[#333C4D]">Convidar cliente</DrawerTitle>
            <DrawerDescription>
              Gere um link para conectar um cliente ao seu painel de advisor.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={onSubmit} className="grid gap-3 px-5 pb-5 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-600">E-mail do cliente (opcional)</span>
              <input
                type="email"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                placeholder="cliente@exemplo.com"
                {...form.register('emailOptional')}
              />
              <span className="text-xs text-red-600">{form.formState.errors.emailOptional?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Validade (dias)</span>
              <input
                type="number"
                min={1}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('expiresInDays')}
              />
              <span className="text-xs text-red-600">{form.formState.errors.expiresInDays?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Maximo de usos</span>
              <input
                type="number"
                min={1}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('maxUses')}
              />
              <span className="text-xs text-red-600">{form.formState.errors.maxUses?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-600">Permissao padrao</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...form.register('permission')}
              >
                <option value="READ_WRITE">Leitura e escrita</option>
                <option value="READ_ONLY">Somente leitura</option>
              </select>
              <span className="text-xs text-slate-500">
                Defina o nivel de acesso inicial desse vinculo.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2 md:col-span-2">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </DrawerClose>
              <button
                type="submit"
                disabled={createInviteMutation.isPending}
                className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
              >
                {createInviteMutation.isPending ? 'Gerando...' : 'Gerar convite'}
              </button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
      <Toaster />
    </AdvisorGuard>
  )
}
