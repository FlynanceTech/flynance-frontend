'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'

import LegalDocsModal, { type LegalDocKey } from '@/components/ui/LegalDocsModal'
import { useUserSession } from '@/stores/useUserSession'
import {
  useAcceptAdvisorGeneratedInvite,
  useAdvisorGeneratedInviteByToken,
} from '@/hooks/query/useAdvisor'
import type { AdvisorGeneratedInvite } from '@/services/advisor'

function getDisplayName(invite: AdvisorGeneratedInvite | null | undefined) {
  if (!invite) return 'Cliente'
  if (invite.accountType === 'COUPLE') {
    return [invite.clientName, invite.clientName2].filter(Boolean).join(' e ') || 'Casal'
  }
  return invite.clientName || 'Cliente'
}

function getAdvisorName(invite: AdvisorGeneratedInvite | null | undefined) {
  return invite?.advisorName || 'seu consultor'
}

function resolvePlanSlug(invite: AdvisorGeneratedInvite | null | undefined) {
  if (invite?.planSlug) return invite.planSlug
  return invite?.accountType === 'COUPLE' ? 'flynance-casal' : 'essencial-mensal'
}

function isInviteBlocked(invite: AdvisorGeneratedInvite | null | undefined) {
  if (!invite) return false
  if (invite.status === 'ACCEPTED' || invite.status === 'CANCELLED' || invite.status === 'EXPIRED') {
    return true
  }

  if (invite.expiresAt) {
    const expiresAt = new Date(invite.expiresAt)
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      return true
    }
  }

  return false
}

export default function AdvisorClientInviteAcceptClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = String(searchParams.get('token') ?? '').trim()
  const { status, fetchAccount } = useUserSession()
  const inviteQuery = useAdvisorGeneratedInviteByToken(token)
  const acceptInviteMutation = useAcceptAdvisorGeneratedInvite()
  const [legalOpen, setLegalOpen] = useState(false)
  const [legalDoc, setLegalDoc] = useState<LegalDocKey>('termos')

  const invite = inviteQuery.data ?? null
  const isValidToken = token.length >= 10
  const isClientPays = invite?.paymentResponsible === 'CLIENT'
  const blocked = isInviteBlocked(invite)
  const nextToLogin = useMemo(
    () => `/login?next=${encodeURIComponent(`/advisor/client-invite/accept?token=${token}`)}`,
    [token]
  )
  const checkoutHref = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set('plano', resolvePlanSlug(invite))
    qs.set('advisorInviteToken', token)
    return `/cadastro/checkout?${qs.toString()}`
  }, [invite, token])

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  function openLegal(doc: LegalDocKey) {
    setLegalDoc(doc)
    setLegalOpen(true)
  }

  const handlePrimaryAction = async () => {
    if (!isValidToken || acceptInviteMutation.isPending || blocked) return

    if (isClientPays) {
      router.push(checkoutHref)
      return
    }

    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      router.push(nextToLogin)
      return
    }

    try {
      await acceptInviteMutation.mutateAsync(token)
      await fetchAccount()
      router.replace('/dashboard')
    } catch {
      // erro tratado no hook
    }
  }

  const advisorName = getAdvisorName(invite)
  const displayName = getDisplayName(invite)
  const accountType = invite?.accountType ?? 'INDIVIDUAL'
  const title =
    accountType === 'COUPLE'
      ? `${displayName}, vamos controlar o orçamento de vocês?`
      : `${displayName}, vamos controlar o seu orçamento?`
  const primaryLabel = isClientPays ? 'Prosseguir para pagamento' : 'Aceitar convite'
  const primaryLoading = acceptInviteMutation.isPending || (!isClientPays && (status === 'idle' || status === 'loading'))

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))] transition-colors">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#2F6E91]">Convite Flynance</p>
            <h1 className="mt-2 text-xl font-semibold leading-7 text-[#333C4D]">{title}</h1>
          </div>
          {invite?.paymentResponsible && (
            <span className="rounded-full border border-[#D7EAF5] bg-[#F3FAFF] px-3 py-1 text-xs font-semibold text-[#2F6E91]">
              Paga: {invite.paymentResponsible === 'CLIENT' ? 'cliente' : 'consultor'}
            </span>
          )}
        </div>

        {inviteQuery.isLoading && isValidToken ? (
          <div className="mt-5 h-32 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
            {accountType === 'COUPLE' ? (
              <>
                <p>
                  Sejam bem-vindos à Flynance, a nossa nova plataforma de controle orçamentário.
                  Aqui vamos controlar as finanças do casal pela inteligência artificial da Fly no WhatsApp
                  e pelo painel conjunto, personalizado.
                </p>
                <p>Ao aceitar este convite, vocês permitem que {advisorName}:</p>
              </>
            ) : (
              <>
                <p>
                  Seja bem-vindo(a) à Flynance, a nossa nova plataforma de controle orçamentário.
                  Aqui vamos controlar as suas finanças pela inteligência artificial da Fly no WhatsApp
                  e pelo seu painel personalizado.
                </p>
                <p>Ao aceitar este convite, você permite que {advisorName}:</p>
              </>
            )}

            <ul className="list-disc space-y-1 pl-5">
              <li>Visualize valores consolidados de gastos e receitas em tempo real;</li>
              <li>Visualize relatórios gerados pela Fly;</li>
              <li>Visualize contas fixas mensais cadastradas na Fly;</li>
              <li>Edite categorias e estabeleça limites de gasto;</li>
              <li>Acompanhe a evolução financeira e sugira ajustes no planejamento.</li>
            </ul>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-[#333C4D]">Limites de acesso do Advisor</p>
              <p className="mt-1">
                {advisorName} não verá os estabelecimentos em que {accountType === 'COUPLE' ? 'vocês estão' : 'você está'}
                {' '}transacionando, não terá acesso a senhas, dados completos de cartão, CVV, dados bancários
                sensíveis ou qualquer credencial.
              </p>
            </div>

            <p>
              Leia nossos{' '}
              <button
                type="button"
                onClick={() => openLegal('termos')}
                className="font-semibold text-primary underline"
              >
                Termos de Uso
              </button>
              {' '}e{' '}
              <button
                type="button"
                onClick={() => openLegal('privacidade')}
                className="font-semibold text-primary underline"
              >
                Política de Privacidade
              </button>
              .
            </p>
          </div>
        )}

        {!isValidToken && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Token de convite inválido.
          </div>
        )}

        {inviteQuery.isError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Não foi possível carregar todos os dados do convite agora.
          </div>
        )}

        {blocked && invite && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Este convite não está mais disponível.
          </div>
        )}

        {acceptInviteMutation.isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {acceptInviteMutation.error instanceof Error
              ? acceptInviteMutation.error.message
              : 'Não foi possível aceitar o convite.'}
          </div>
        )}

        {acceptInviteMutation.isSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Convite aceito com sucesso. Redirecionando...
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!isValidToken || primaryLoading || blocked || inviteQuery.isLoading}
            className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
          >
            {primaryLoading ? 'Confirmando...' : primaryLabel}
          </button>

          {!isClientPays && status === 'unauthenticated' && (
            <Link
              href={nextToLogin}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Fazer login
            </Link>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voltar
          </button>
        </div>
      </section>
      <LegalDocsModal open={legalOpen} initialDoc={legalDoc} onClose={() => setLegalOpen(false)} />
      <Toaster />
    </main>
  )
}
