'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { useUserSession } from '@/stores/useUserSession'
import { useAcceptAdvisorClientInvite } from '@/hooks/query/useAdvisor'

export default function AdvisorClientInviteAcceptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = String(searchParams.get('token') ?? '').trim()
  const { status, fetchAccount } = useUserSession()
  const acceptInviteMutation = useAcceptAdvisorClientInvite()

  const nextToLogin = useMemo(
    () => `/login?next=${encodeURIComponent(`/advisor/client-invite/accept?token=${token}`)}`,
    [token]
  )
  const isValidToken = token.length >= 10

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  const handleAccept = async () => {
    if (!isValidToken || acceptInviteMutation.isPending) return

    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      router.push(nextToLogin)
      return
    }

    try {
      await acceptInviteMutation.mutateAsync(token)
      router.replace('/dashboard')
    } catch {
      // erro tratado no hook
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-8">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-[#333C4D]">Convite de cliente</h1>
        <p className="mt-2 text-sm text-slate-600">
          Voce foi convidado para conectar sua conta a um advisor na Flynance.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium">Ao aceitar, o advisor podera:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>visualizar seus relatorios e indicadores financeiros;</li>
            <li>atuar no seu dashboard conforme a permissao concedida;</li>
            <li>acompanhar evolucao e sugerir ajustes no planejamento.</li>
          </ul>
        </div>

        {!isValidToken && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Token de convite invalido.
          </div>
        )}

        {acceptInviteMutation.isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {acceptInviteMutation.error instanceof Error
              ? acceptInviteMutation.error.message
              : 'Nao foi possivel aceitar o convite.'}
          </div>
        )}

        {acceptInviteMutation.isSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Convite aceito com sucesso. Redirecionando...
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!isValidToken || acceptInviteMutation.isPending || status === 'idle' || status === 'loading'}
            className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
          >
            {acceptInviteMutation.isPending ? 'Confirmando...' : 'Aceitar convite'}
          </button>

          {status === 'unauthenticated' && (
            <Link
              href={nextToLogin}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center"
            >
              Fazer login
            </Link>
          )}

          <Link
            href="/dashboard"
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center"
          >
            Voltar
          </Link>
        </div>
      </section>
      <Toaster />
    </main>
  )
}

