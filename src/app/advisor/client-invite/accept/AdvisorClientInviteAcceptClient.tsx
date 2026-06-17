'use client'

import Link from 'next/link'
import axios from 'axios'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

import LegalDocsModal, { type LegalDocKey } from '@/components/ui/LegalDocsModal'
import { useUserSession } from '@/stores/useUserSession'
import {
  useAcceptAdvisorGeneratedInvite,
  useAdvisorGeneratedInviteByToken,
} from '@/hooks/query/useAdvisor'
import { logAdvisorInviteEvent } from '@/services/advisor'
import type { AdvisorGeneratedInvite } from '@/services/advisor'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api'

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function validateBrazilianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  // 10 = landline (DDD + 8), 11 = mobile (DDD + 9)
  if (digits.length === 10 || digits.length === 11) return true
  // With country code 55
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return true
  return false
}

function normalizeBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  return phone
}

function resolveStripeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Não foi possível aceitar o convite.'
  if (/incomplete_expired|cannot update a subscription that is/i.test(msg)) {
    return 'Não conseguimos atualizar essa assinatura antiga. Gere um novo link de pagamento com o consultor.'
  }
  return msg
}

// ─── component ────────────────────────────────────────────────────────────────

export default function AdvisorClientInviteAcceptClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = String(searchParams.get('token') ?? '').trim()
  const { status, fetchAccount } = useUserSession()
  const inviteQuery = useAdvisorGeneratedInviteByToken(token)
  const acceptInviteMutation = useAcceptAdvisorGeneratedInvite()
  const [legalOpen, setLegalOpen] = useState(false)
  const [legalDoc, setLegalDoc] = useState<LegalDocKey>('termos')

  // Welcome popup (shown after accepting invite)
  const [welcomeOpen, setWelcomeOpen] = useState(false)

  // Inline signup form
  const [signupStep, setSignupStep] = useState<'hidden' | 'form' | 'otp'>('hidden')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
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

  const advisorName = getAdvisorName(invite)
  const displayName = getDisplayName(invite)
  const accountType = invite?.accountType ?? 'INDIVIDUAL'

  // Auto-redirect when user is authenticated and invite is already ACCEPTED
  const hasAutoRedirectedRef = useRef(false)
  useEffect(() => {
    if (
      status === 'authenticated' &&
      invite?.status === 'ACCEPTED' &&
      !hasAutoRedirectedRef.current
    ) {
      hasAutoRedirectedRef.current = true
      logAdvisorInviteEvent('invite_already_accepted', { token })
      router.replace('/dashboard')
    }
  }, [status, invite?.status, token, router])

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  function openLegal(doc: LegalDocKey) {
    setLegalDoc(doc)
    setLegalOpen(true)
  }

  async function acceptAndRedirect() {
    logAdvisorInviteEvent('invite_accept_started', { token })

    // Idempotency: if already accepted, just redirect
    if (invite?.status === 'ACCEPTED') {
      logAdvisorInviteEvent('invite_already_accepted', { token })
      router.replace('/dashboard')
      return
    }

    try {
      await acceptInviteMutation.mutateAsync(token)
      await fetchAccount()
      logAdvisorInviteEvent('invite_status_updated', { token, status: 'ACCEPTED' })
      setWelcomeOpen(true)
    } catch {
      // erro já tratado no hook (toast)
    }
  }

  async function handleSendCode() {
    setSignupError(null)
    if (!signupName.trim()) {
      setSignupError('Informe seu nome completo.')
      return
    }
    if (!signupEmail.trim()) {
      setSignupError('Informe seu e-mail.')
      return
    }
    if (!signupPhone.trim()) {
      setSignupError('Informe seu telefone/WhatsApp.')
      return
    }
    if (!validateBrazilianPhone(signupPhone)) {
      setSignupError('Informe um telefone válido com DDD (ex: 11 91234-5678).')
      return
    }

    setSignupLoading(true)
    try {
      await axios.post(`${API_BASE}/auth/send-code`, {
        email: signupEmail.trim(),
        register: true,
        phone: normalizeBrazilianPhone(signupPhone),
      })
      setSignupStep('otp')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } }
      const msg =
        axiosErr?.response?.data?.error ||
        axiosErr?.response?.data?.message ||
        'Erro ao enviar código.'
      const isExistingUser =
        axiosErr?.response?.status === 409 ||
        /já existe|already exists|email.*cadastrado|already registered/i.test(msg)
      if (isExistingUser) {
        logAdvisorInviteEvent('invite_existing_user_detected', { email: signupEmail })
        setSignupError(
          `Este e-mail já tem uma conta na Flynance. Faça login para vincular ao consultor ${advisorName}.`
        )
      } else {
        setSignupError(msg)
      }
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
        {
          email: signupEmail.trim(),
          code: signupCode.trim(),
          name: signupName.trim(),
          phone: normalizeBrazilianPhone(signupPhone),
        },
        { withCredentials: true }
      )
      await fetchAccount()
      logAdvisorInviteEvent('invite_user_created', { email: signupEmail })
      setSignupStep('hidden')
      toast.success('Conta criada com sucesso!')

      // After account creation: auto-accept (advisor/org pays) or go to checkout (client pays)
      if (isClientPays) {
        router.push(checkoutHref)
      } else if (invite && !isInviteBlocked(invite)) {
        await acceptAndRedirect()
      } else {
        router.replace('/dashboard')
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } }
      const msg =
        axiosErr?.response?.data?.error ||
        axiosErr?.response?.data?.message ||
        'Código inválido.'
      setSignupError(msg)
    } finally {
      setSignupLoading(false)
    }
  }

  const handlePrimaryAction = async () => {
    if (!isValidToken || acceptInviteMutation.isPending) return

    // Idempotency
    if (invite?.status === 'ACCEPTED') {
      router.replace('/dashboard')
      return
    }

    if (blocked) return

    if (isClientPays) {
      router.push(checkoutHref)
      return
    }

    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      router.push(nextToLogin)
      return
    }

    await acceptAndRedirect()
  }

  const title =
    accountType === 'COUPLE'
      ? `${displayName}, vamos controlar o orçamento de vocês?`
      : `${displayName}, vamos controlar o seu orçamento?`
  const primaryLabel = isClientPays ? 'Prosseguir para pagamento' : 'Aceitar convite'
  const primaryLoading =
    acceptInviteMutation.isPending || (!isClientPays && (status === 'idle' || status === 'loading'))

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))] transition-colors">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#2F6E91]">Convite Flynance</p>
            <h1 className="mt-2 text-xl font-semibold leading-7 text-[#333C4D]">{title}</h1>
          </div>
          {/* Badge: mostrar quem paga — apenas quando não é o cliente */}
          {invite?.paymentResponsible && invite.paymentResponsible !== 'CLIENT' && (
            <span className="max-w-[180px] rounded-full border border-[#D7EAF5] bg-[#F3FAFF] px-3 py-1 text-center text-xs font-semibold leading-4 text-[#2F6E91]">
              {invite.paymentResponsible === 'ADVISOR'
                ? `Será pago por ${advisorName}`
                : 'Pago pela organização'}
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
                {advisorName} não verá os estabelecimentos em que{' '}
                {accountType === 'COUPLE' ? 'vocês estão' : 'você está'}
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

        {blocked && invite && invite.status !== 'ACCEPTED' && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {invite.status === 'CANCELLED'
              ? 'Este convite foi cancelado pelo consultor.'
              : 'Este convite não está mais disponível (expirado).'}
          </div>
        )}

        {acceptInviteMutation.isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {resolveStripeErrorMessage(acceptInviteMutation.error)}
          </div>
        )}

        {acceptInviteMutation.isSuccess && !welcomeOpen && (
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
                  placeholder="Nome completo *"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2]"
                />
                <input
                  type="email"
                  placeholder="E-mail *"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2]"
                />
                <input
                  type="tel"
                  placeholder="Telefone/WhatsApp com DDD * (ex: 11 91234-5678)"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2]"
                />
                <p className="text-xs text-slate-400">
                  Necessário para receber mensagens da Fly via WhatsApp.
                </p>
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
                <>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={signupLoading}
                    className="h-9 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
                  >
                    {signupLoading ? 'Enviando...' : 'Enviar código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupStep('hidden')}
                    className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                </>
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
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {/* Botão principal */}
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

      {/* Welcome popup — mostrado após aceitar convite com sucesso */}
      {welcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D7EAF5] bg-white p-6 shadow-xl">
            <p className="text-2xl">🎉</p>
            <h2 className="mt-3 text-xl font-semibold text-[#333C4D]">
              Parabéns pela decisão de controlar seu orçamento junto ao {advisorName}!
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Está tudo pronto. Agora você já pode começar a usar a Fly pelo WhatsApp e pelo seu painel.
            </p>
            <button
              type="button"
              onClick={() => {
                setWelcomeOpen(false)
                router.replace('/dashboard')
              }}
              className="mt-5 h-10 w-full rounded-xl bg-[#4F98C2] text-sm font-semibold text-white hover:bg-[#3f86b0]"
            >
              Começar agora
            </button>
          </div>
        </div>
      )}

      <LegalDocsModal open={legalOpen} initialDoc={legalDoc} onClose={() => setLegalOpen(false)} />
      <Toaster />
    </main>
  )
}
