'use client'

import Link from 'next/link'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

import LegalDocsModal, { type LegalDocKey } from '@/components/ui/LegalDocsModal'
import { useUserSession } from '@/stores/useUserSession'
import {
  useAcceptAdvisorGeneratedInvite,
  useAdvisorGeneratedInviteByToken,
} from '@/hooks/query/useAdvisor'
import type { AdvisorGeneratedInvite } from '@/services/advisor'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api'

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

  // Formulário de cadastro inline (para quem não tem conta)
  const [signupStep, setSignupStep] = useState<'hidden' | 'form' | 'otp'>('hidden')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupCode, setSignupCode] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)

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

  async function handleSendCode() {
    if (!signupName.trim() || !signupEmail.trim()) {
      setSignupError('Preencha nome e e-mail.')
      return
    }
    setSignupLoading(true)
    setSignupError(null)
    try {
      await axios.post(`${API_BASE}/auth/send-code`, { email: signupEmail.trim(), register: true })
      setSignupStep('otp')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Erro ao enviar código.'
      setSignupError(msg)
    } finally {
      setSignupLoading(false)
    }
  }

  async function handleVerifyAndCreate() {
    if (!signupCode.trim()) {
      setSignupError('Informe o código recebido.')
      return
    }
    setSignupLoading(true)
    setSignupError(null)
    try {
      await axios.post(
        `${API_BASE}/auth/verify-code`,
        { email: signupEmail.trim(), code: signupCode.trim(), name: signupName.trim() },
        { withCredentials: true }
      )
      await fetchAccount()
      setSignupStep('hidden')
      toast.success('Conta criada com sucesso!')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Código inválido.'
      setSignupError(msg)
    } finally {
      setSignupLoading(false)
    }
  }

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
              Paga: {invite.paymentResponsible === 'CLIENT' ? 'cliente' : invite.paymentResponsible === 'ORG' ? 'organização' : 'consultor'}
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

        {/* Formulário inline de cadastro (advisor/org paga, usuário sem conta) */}
        {!isClientPays && status === 'unauthenticated' && signupStep !== 'hidden' && (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              {signupStep === 'form' ? 'Crie sua conta' : 'Verifique seu e-mail'}
            </p>

            {signupStep === 'form' && (
              <>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2]"
                />
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2]"
                />
              </>
            )}

            {signupStep === 'otp' && (
              <>
                <p className="text-xs text-slate-500">
                  Enviamos um código para <strong>{signupEmail}</strong>. Verifique sua caixa de entrada.
                </p>
                <input
                  type="text"
                  placeholder="Código de verificação"
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value)}
                  maxLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2]"
                />
              </>
            )}

            {signupError && (
              <p className="text-xs text-red-600">{signupError}</p>
            )}

            <div className="flex gap-2">
              {signupStep === 'form' && (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={signupLoading}
                  className="h-9 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
                >
                  {signupLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              )}
              {signupStep === 'otp' && (
                <>
                  <button
                    type="button"
                    onClick={handleVerifyAndCreate}
                    disabled={signupLoading}
                    className="h-9 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
                  >
                    {signupLoading ? 'Verificando...' : 'Verificar e criar conta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupStep('form')}
                    disabled={signupLoading}
                    className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Voltar
                  </button>
                </>
              )}
              {signupStep === 'form' && (
                <button
                  type="button"
                  onClick={() => setSignupStep('hidden')}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {/* Botão principal: só aparece quando autenticado OU quando é o cliente que paga (vai para checkout) */}
          {(isClientPays || status === 'authenticated') && (
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!isValidToken || primaryLoading || blocked || inviteQuery.isLoading}
              className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
            >
              {primaryLoading ? 'Confirmando...' : primaryLabel}
            </button>
          )}

          {!isClientPays && status === 'unauthenticated' && signupStep === 'hidden' && (
            <>
              <button
                type="button"
                onClick={() => setSignupStep('form')}
                className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0]"
              >
                Criar conta
              </button>
              <Link
                href={nextToLogin}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fazer login
              </Link>
            </>
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
