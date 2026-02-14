'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useAdvisorInvites,
  useCreateAdvisorInvite,
  useRevokeAdvisorInvite,
} from '@/hooks/query/useAdmin'
import toast from 'react-hot-toast'

const inviteSchema = z.object({
  email: z.union([z.literal(''), z.string().email('Email invalido')]).optional(),
  expiresInDays: z.coerce.number().int().min(1, 'Minimo 1 dia').max(365),
  maxUses: z.coerce.number().int().min(1, 'Minimo 1 uso').max(1000),
})

type InviteFormValues = z.infer<typeof inviteSchema>

function formatDate(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('pt-BR')
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

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

export default function AdminAdvisorsPage() {
  const [page, setPage] = useState(1)
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('')

  const invitesQuery = useAdvisorInvites({ page, limit: 10 })
  const createInviteMutation = useCreateAdvisorInvite()
  const revokeInviteMutation = useRevokeAdvisorInvite()

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      expiresInDays: 7,
      maxUses: 1,
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
    })

    setGeneratedInviteUrl(response.inviteUrl || response.invite.inviteUrl || '')
  })

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">Gerar convite advisor</h3>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Email (opcional)</span>
            <input
              type="email"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              placeholder="advisor@flynance.com"
              {...form.register('email')}
            />
            <span className="text-xs text-red-600">{form.formState.errors.email?.message}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Expiracao (dias)</span>
            <input
              type="number"
              min={1}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              {...form.register('expiresInDays')}
            />
            <span className="text-xs text-red-600">
              {form.formState.errors.expiresInDays?.message}
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Max uses</span>
            <input
              type="number"
              min={1}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              {...form.register('maxUses')}
            />
            <span className="text-xs text-red-600">{form.formState.errors.maxUses?.message}</span>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={createInviteMutation.isPending}
              className="h-10 w-full rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
            >
              {createInviteMutation.isPending ? 'Gerando...' : 'Gerar convite'}
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
                toast.success('Link copiado.')
              }}
              className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Copiar link
            </button>
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">Convites</h3>

        {invitesQuery.isLoading ? (
          <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-100" />
        ) : invites.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Nenhum convite encontrado.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Expira</th>
                  <th className="pb-2 font-medium">Usos</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-slate-100">
                    <td className="py-3">{invite.email || '-'}</td>
                    <td className="py-3">{formatDate(invite.expiresAt)}</td>
                    <td className="py-3">
                      {invite.usedCount}/{invite.maxUses}
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          statusBadge(invite.status),
                        ].join(' ')}
                      >
                        {invite.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const value = invite.inviteUrl || invite.token || invite.id
                            await copyText(value)
                            toast.success('Convite copiado.')
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Copiar
                        </button>
                        <button
                          type="button"
                          disabled={invite.status !== 'active' || revokeInviteMutation.isPending}
                          onClick={() => revokeInviteMutation.mutate(invite.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
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
            Pagina {page} de {totalPages}
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
    </section>
  )
}
