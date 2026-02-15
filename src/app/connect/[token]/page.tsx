'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { useUserSession } from '@/stores/useUserSession'
import { useAcceptAdvisorClientConnection } from '@/hooks/query/useAdvisor'

export default function ConnectAdvisorPage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '').trim()
  const { status, fetchAccount } = useUserSession()
  const acceptConnectionMutation = useAcceptAdvisorClientConnection()

  const nextToLogin = useMemo(() => `/login?next=${encodeURIComponent(`/connect/${token}`)}`, [token])
  const isValidToken = token.length >= 3

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  const handleAccept = async () => {
    if (!isValidToken || acceptConnectionMutation.isPending) return

    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      router.push(nextToLogin)
      return
    }

    try {
      const result = await acceptConnectionMutation.mutateAsync({ tokenOrSlug: token })
      if (result === undefined) {
        router.replace('/dashboard')
      }
    } catch {
      // erro ja tratado no onError da mutation
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-8">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-[#333C4D]">Conectar com Advisor</h1>
        <p className="mt-2 text-sm text-slate-600">
          Voce esta iniciando a conexao com um advisor na Flynance.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium">Ao aceitar, o advisor podera:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>visualizar seus relatorios e indicadores financeiros;</li>
            <li>atuar no seu dashboard conforme o nivel de permissao concedido;</li>
            <li>acompanhar evolucao e sugerir ajustes no planejamento.</li>
          </ul>
        </div>

        {!isValidToken && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Link de conexao invalido.
          </div>
        )}

        {acceptConnectionMutation.isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {acceptConnectionMutation.error instanceof Error
              ? acceptConnectionMutation.error.message
              : 'Nao foi possivel concluir a conexao com o advisor.'}
          </div>
        )}

        {acceptConnectionMutation.isSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Conexao confirmada com sucesso. Redirecionando...
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={
              !isValidToken ||
              acceptConnectionMutation.isPending ||
              status === 'idle' ||
              status === 'loading'
            }
            className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
          >
            {acceptConnectionMutation.isPending ? 'Confirmando...' : 'Aceitar conexao'}
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
