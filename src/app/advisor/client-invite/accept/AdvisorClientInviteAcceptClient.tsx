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
  if (digits.length === 10 || digits.length === 11) return true
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

type InviteStep =
  | 'prefill'          // Formulário inicial (nome, e-mail, telefone) — unauthenticated
  | 'checking'         // Verificando existência do usuário
  | 'existing-login'   // Conta encontrada + auto-aceita → redirecionar para login
  | 'existing-payment' // Conta encontrada sem plano + CLIENT paga → login antes do checkout
  | 'signup-otp'       // Conta não existe + ADVISOR/ORG paga → criar conta via OTP
  | 'otp-verify'       // Verificar código OTP
  | 'done'             // Authenticated, invite accepted

// ─── component ────────────────────────────────────────────────────────────────

export default function AdvisorClientInviteAcceptClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = String(searchParams.get('token') ?? '').trim()
  const justAccepted = searchParams.get('just_accepted') === '1'
  const { status, fetchAccount } = useUserSession()
  const inviteQuery = useAdvisorGeneratedInviteByToken(token)
  const acceptInviteMutation = useAcceptAdvisorGeneratedInvite()
  const [legalOpen, setLegalOpen] = useState(false)
  const [legalDoc, setLegalDoc] = useState<LegalDocKey>('termos')
  const [welcomeOpen, setWelcomeOpen] = useState(false)

  // ─── Prefill form (step 1 for unauthenticated) ────────────────────────────
  const [step, setStep] = useState<InviteStep>('prefill')
  const [prefillName, setPrefillName] = useState('')
  const [prefillEmail, setPrefillEmail] = useState('')
  const [prefillPhone, setPrefillPhone] = useState('')
  // Couple: second person
  const [prefillName2, setPrefillName2] = useState('')
  const [prefillEmail2, setPrefillEmail2] = useState('')
  const [prefillPhone2, setPrefillPhone2] = useState('')
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [autoAcceptAdvisorName, setAutoAcceptAdvisorName] = useState('')

  // ─── OTP signup (new user, advisor/org pays) ──────────────────────────────
  const [signupCode, setSignupCode] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)

  const invite = inviteQuery.data ?? null
  const isValidToken = token.length >= 10
  const isClientPays = invite?.paymentResponsible === 'CLIENT'
  const isCouple = invite?.accountType === 'COUPLE'
  const blocked = isInviteBlocked(invite)

  const advisorName = getAdvisorName(invite)
  const displayName = getDisplayName(invite)
  const accountType = invite?.accountType ?? 'INDIVIDUAL'

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

  // Login + checkout (existing user without subscription, client pays)
  const loginThenCheckout = useMemo(() => {
    return `/login?next=${encodeURIComponent(checkoutHref)}`
  }, [checkoutHref])

  // Login after auto-accept (shows welcome popup on return)
  const loginAfterAutoAccept = useMemo(
    () =>
      `/login?next=${encodeURIComponent(
        `/advisor/client-invite/accept?token=${token}&just_accepted=1`
      )}`,
    [token]
  )

  // ─── Auto-redirect when authenticated and invite already ACCEPTED ──────────
  const hasAutoRedirectedRef = useRef(false)
  useEffect(() => {
    if (!status || status === 'idle' || status === 'loading') return
    if (status !== 'authenticated') return
    if (hasAutoRedirectedRef.current) return
    if (inviteQuery.isLoading) return

    if (invite?.status === 'ACCEPTED') {
      hasAutoRedirectedRef.current = true
      if (justAccepted) {
        setWelcomeOpen(true)
      } else {
        logAdvisorInviteEvent('invite_already_accepted', { token })
        router.replace('/dashboard')
      }
      return
    }

    // Returning from auto-accept+login (just_accepted=1): invite may still be PENDING
    // if the backend didn't mark ACCEPTED synchronously. Call the authenticated accept
    // to finalize — this handles both CLIENT-pays and ADVISOR/ORG-pays existing accounts.
    if (justAccepted && invite && !blocked) {
      hasAutoRedirectedRef.current = true
      acceptAndRedirect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, invite, token, router, justAccepted, inviteQuery.isLoading, blocked])

  // ─── Auto-accept when authenticated + PENDING + advisor/org pays ──────────
  const hasAutoAcceptedRef = useRef(false)
  useEffect(() => {
    if (status !== 'authenticated') return
    if (!invite || invite.status !== 'PENDING') return
    if (isClientPays || blocked) return
    if (justAccepted) return  // just_accepted=1 path handled by the auto-redirect effect above
    if (hasAutoAcceptedRef.current || acceptInviteMutation.isPending) return
    hasAutoAcceptedRef.current = true
    acceptAndRedirect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, invite?.status, isClientPays, blocked, acceptInviteMutation.isPending, justAccepted])

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  function openLegal(doc: LegalDocKey) {
    setLegalDoc(doc)
    setLegalOpen(true)
  }

  // ─── Authenticated flow: accept button ────────────────────────────────────
  async function acceptAndRedirect() {
    logAdvisorInviteEvent('invite_accept_started', { token })

    if (invite?.status === 'ACCEPTED') {
      logAdvisorInviteEvent('invite_already_accepted', { token })
      // When returning from auto-accept+login, show welcome popup instead of silent redirect
      if (justAccepted) {
        setWelcomeOpen(true)
      } else {
        router.replace('/dashboard')
      }
      return
    }

    try {
      await acceptInviteMutation.mutateAsync(token)
      await fetchAccount()
      logAdvisorInviteEvent('invite_status_marked_accepted', { token })
      setWelcomeOpen(true)
    } catch {
      // handled by mutation hook; if returning from auto-accept flow the advisor link
      // already exists, so show the welcome popup even if this secondary call fails
      if (justAccepted) {
        setWelcomeOpen(true)
      }
    }
  }

  async function handlePrimaryAction() {
    if (!isValidToken || acceptInviteMutation.isPending) return
    if (invite?.status === 'ACCEPTED') { router.replace('/dashboard'); return }
    if (blocked) return
    // Only send to checkout for client-pays if we're NOT returning from a successful
    // auto-accept (just_accepted=1 means the advisor link already exists — skip payment)
    if (isClientPays && !justAccepted) { router.push(checkoutHref); return }
    if (status === 'idle' || status === 'loading') return
    if (status === 'unauthenticated') { router.push(nextToLogin); return }
    await acceptAndRedirect()
  }

  // ─── Prefill step: submit ─────────────────────────────────────────────────
  async function handlePrefillSubmit() {
    setPrefillError(null)

    if (!prefillName.trim()) { setPrefillError('Informe o nome completo.'); return }
    if (!prefillEmail.trim()) { setPrefillError('Informe o e-mail.'); return }
    if (!prefillPhone.trim()) { setPrefillError('Informe o telefone/WhatsApp.'); return }
    if (!validateBrazilianPhone(prefillPhone)) {
      setPrefillError('Informe um telefone válido com DDD (ex: 11 91234-5678).')
      return
    }
    if (isCouple) {
      if (!prefillName2.trim()) { setPrefillError('Informe o nome da segunda pessoa.'); return }
      if (!prefillEmail2.trim()) { setPrefillError('Informe o e-mail da segunda pessoa.'); return }
      if (!prefillPhone2.trim()) { setPrefillError('Informe o telefone da segunda pessoa.'); return }
      if (!validateBrazilianPhone(prefillPhone2)) {
        setPrefillError('Informe um telefone válido para a segunda pessoa.')
        return
      }
    }

    setPrefillLoading(true)
    setStep('checking')

    logAdvisorInviteEvent('invite_prefill_submitted', { email: prefillEmail })

    try {
      const checkRes = await axios.post(`${API_BASE}/advisor/invites/${token}/check-prefill`, {
        email: prefillEmail.trim(),
        phone: normalizeBrazilianPhone(prefillPhone),
      })

      const { userExists, conflictError, inviteAlreadyAccepted } = checkRes.data

      if (inviteAlreadyAccepted) {
        setPrefillError('Este convite já foi aceito. Faça login para acessar o painel.')
        setStep('prefill')
        return
      }

      if (conflictError) {
        logAdvisorInviteEvent('invite_existing_user_checked', { conflict: true })
        setPrefillError(conflictError)
        setStep('prefill')
        return
      }

      logAdvisorInviteEvent(
        userExists ? 'invite_existing_user_found' : 'invite_existing_user_not_found',
        { email: prefillEmail }
      )

      if (userExists) {
        logAdvisorInviteEvent('invite_existing_user_checked', { userExists: true })

        // Tenta auto-aceitar
        try {
          const acceptRes = await axios.post(`${API_BASE}/advisor/invites/${token}/auto-accept`, {
            email: prefillEmail.trim(),
            phone: normalizeBrazilianPhone(prefillPhone),
          })

          const { ok, needsPayment, advisorName: aName } = acceptRes.data
          setAutoAcceptAdvisorName(aName || advisorName)

          if (needsPayment) {
            // Usuário existe mas não tem plano ativo — fazer login primeiro, depois checkout
            logAdvisorInviteEvent('invite_redirect_to_payment', { existingUser: true })
            setStep('existing-payment')
          } else {
            // Auto-aceito com sucesso — redirecionar para login
            logAdvisorInviteEvent('invite_auto_accepted_existing_user', { ok })
            logAdvisorInviteEvent('invite_redirect_to_login', {})
            setStep('existing-login')
          }
        } catch (autoErr: unknown) {
          const axErr = autoErr as { response?: { data?: { error?: string }; status?: number } }
          const msg = axErr?.response?.data?.error ?? 'Não foi possível vincular a conta.'
          setPrefillError(msg)
          setStep('prefill')
        }
      } else {
        // Usuário novo
        logAdvisorInviteEvent('invite_redirect_to_payment', { newUser: true })

        if (isClientPays) {
          // Checkout cria conta + vincula convite
          router.push(checkoutHref)
        } else {
          // ADVISOR/ORG paga — criar conta via OTP
          await sendOtpForNewUser()
        }
      }
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } }
      const msg = axErr?.response?.data?.error ?? 'Erro ao verificar dados. Tente novamente.'
      setPrefillError(msg)
      setStep('prefill')
    } finally {
      setPrefillLoading(false)
    }
  }

  // ─── OTP para conta nova (advisor/org paga) ───────────────────────────────
  async function sendOtpForNewUser() {
    setSignupError(null)
    setPrefillLoading(true)
    try {
      await axios.post(`${API_BASE}/auth/send-code`, {
        email: prefillEmail.trim(),
        register: true,
        phone: normalizeBrazilianPhone(prefillPhone),
      })
      setStep('signup-otp')
    } catch (err: unknown) {
      const axErr = err as {
        response?: { status?: number; data?: { error?: string; message?: string } }
      }
      const msg =
        axErr?.response?.data?.error ||
        axErr?.response?.data?.message ||
        'Erro ao enviar código.'
      const isExisting =
        axErr?.response?.status === 409 ||
        /já existe|already exists|email.*cadastrado|already registered/i.test(msg)
      if (isExisting) {
        // Usuário existe mas check-prefill não pegou — trata como existente
        logAdvisorInviteEvent('invite_existing_user_detected', { email: prefillEmail })
        setPrefillError(
          `Este e-mail já tem uma conta na Flynance. Faça login para vincular ao consultor ${advisorName}.`
        )
        setStep('prefill')
      } else {
        setPrefillError(msg)
        setStep('prefill')
      }
    } finally {
      setPrefillLoading(false)
    }
  }

  async function handleVerifyOtpAndCreate() {
    if (!signupCode.trim()) { setSignupError('Informe o código recebido.'); return }
    setSignupLoading(true)
    setSignupError(null)
    try {
      await axios.post(
        `${API_BASE}/auth/verify-code`,
        {
          email: prefillEmail.trim(),
          code: signupCode.trim(),
          name: prefillName.trim(),
          phone: normalizeBrazilianPhone(prefillPhone),
        },
        { withCredentials: true }
      )
      await fetchAccount()
      logAdvisorInviteEvent('invite_user_created', { email: prefillEmail })
      toast.success('Conta criada com sucesso!')

      if (!isClientPays && invite && !isInviteBlocked(invite)) {
        await acceptAndRedirect()
      } else {
        router.replace('/dashboard')
      }
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string; message?: string } } }
      const msg =
        axErr?.response?.data?.error ||
        axErr?.response?.data?.message ||
        'Código inválido.'
      setSignupError(msg)
    } finally {
      setSignupLoading(false)
    }
  }

  // ─── render helpers ───────────────────────────────────────────────────────

  const title =
    accountType === 'COUPLE'
      ? `${displayName}, vamos controlar o orçamento de vocês?`
      : `${displayName}, vamos controlar o seu orçamento?`

  const primaryLabel = isClientPays ? 'Prosseguir para pagamento' : 'Aceitar convite'
  const primaryLoading =
    acceptInviteMutation.isPending || (!isClientPays && (status === 'idle' || status === 'loading'))

  const resolvedAdvisorName = autoAcceptAdvisorName || advisorName

  // ─── Formulário de prefill ────────────────────────────────────────────────
  function renderPrefillForm() {
    const isLoading = prefillLoading || step === 'checking'
    return (
      <div className="mt-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          {isCouple ? 'Informe os dados do casal' : 'Informe seus dados para continuar'}
        </p>

        {isCouple && (
          <p className="text-xs font-medium uppercase tracking-wide text-[#2F6E91]">Pessoa 1</p>
        )}
        <input
          type="text"
          placeholder="Nome completo *"
          value={prefillName}
          onChange={(e) => setPrefillName(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2] disabled:opacity-60"
        />
        <input
          type="email"
          placeholder="E-mail *"
          value={prefillEmail}
          onChange={(e) => setPrefillEmail(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2] disabled:opacity-60"
        />
        <input
          type="tel"
          placeholder="Telefone/WhatsApp com DDD * (ex: 11 91234-5678)"
          value={prefillPhone}
          onChange={(e) => setPrefillPhone(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2] disabled:opacity-60"
        />

        {isCouple && (
          <>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#2F6E91]">Pessoa 2</p>
            <input
              type="text"
              placeholder="Nome completo *"
              value={prefillName2}
              onChange={(e) => setPrefillName2(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2] disabled:opacity-60"
            />
            <input
              type="email"
              placeholder="E-mail *"
              value={prefillEmail2}
              onChange={(e) => setPrefillEmail2(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2] disabled:opacity-60"
            />
            <input
              type="tel"
              placeholder="Telefone/WhatsApp com DDD * (ex: 11 91234-5678)"
              value={prefillPhone2}
              onChange={(e) => setPrefillPhone2(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2] disabled:opacity-60"
            />
          </>
        )}

        <p className="text-xs text-slate-400">
          Usado para verificar sua conta e receber mensagens da Fly via WhatsApp.
        </p>

        {prefillError && (
          <p className="text-xs text-red-600">{prefillError}</p>
        )}

        <button
          type="button"
          onClick={handlePrefillSubmit}
          disabled={isLoading}
          className="h-10 w-full rounded-xl bg-[#4F98C2] text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
        >
          {isLoading ? 'Verificando...' : 'Continuar'}
        </button>
      </div>
    )
  }

  // ─── Tela de conta existente: auto-aceite OK → ir para login ─────────────
  function renderExistingLoginScreen() {
    return (
      <div className="mt-5 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">Conta identificada!</p>
        <p className="text-sm leading-6 text-emerald-700">
          Sua conta foi vinculada ao consultor <strong>{resolvedAdvisorName}</strong>.
          Faça login para acessar o painel.
        </p>
        <Link
          href={loginAfterAutoAccept}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#4F98C2] px-6 text-sm font-semibold text-white hover:bg-[#3f86b0]"
        >
          Fazer login
        </Link>
      </div>
    )
  }

  // ─── Tela de conta existente: sem plano, client paga → login + checkout ──
  function renderExistingPaymentScreen() {
    return (
      <div className="mt-5 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800">Conta encontrada!</p>
        <p className="text-sm leading-6 text-amber-700">
          Encontramos sua conta na Flynance. Para concluir a vinculação com{' '}
          <strong>{resolvedAdvisorName}</strong>, faça login e conclua o pagamento do plano.
        </p>
        <Link
          href={loginThenCheckout}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#4F98C2] px-6 text-sm font-semibold text-white hover:bg-[#3f86b0]"
        >
          Fazer login e prosseguir
        </Link>
        <button
          type="button"
          onClick={() => { setPrefillError(null); setStep('prefill') }}
          className="ml-2 text-sm text-slate-500 underline"
        >
          Corrigir dados
        </button>
      </div>
    )
  }

  // ─── OTP verificação ──────────────────────────────────────────────────────
  function renderOtpVerify() {
    return (
      <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">Verifique seu e-mail</p>
        <p className="text-xs text-slate-500">
          Enviamos um código para <strong>{prefillEmail}</strong>. Verifique sua caixa de entrada.
        </p>
        <input
          type="text"
          placeholder="Código de verificação"
          value={signupCode}
          onChange={(e) => setSignupCode(e.target.value)}
          maxLength={6}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F98C2]"
        />
        {signupError && <p className="text-xs text-red-600">{signupError}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleVerifyOtpAndCreate}
            disabled={signupLoading}
            className="h-9 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
          >
            {signupLoading ? 'Verificando...' : 'Verificar e criar conta'}
          </button>
          <button
            type="button"
            onClick={() => setStep('prefill')}
            disabled={signupLoading}
            className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))] transition-colors">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[#2F6E91]">Convite Flynance</p>
            <h1 className="mt-2 text-xl font-semibold leading-7 text-[#333C4D]">{title}</h1>
          </div>
          {invite?.paymentResponsible && invite.paymentResponsible !== 'CLIENT' && (
            <span className="inline-flex w-fit items-center rounded-full border border-[#D7EAF5] bg-[#F3FAFF] px-3 py-1 text-xs font-semibold text-[#2F6E91]">
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
                  Aqui vamos controlar as finanças do casal pela inteligência artificial da Fly no
                  WhatsApp e pelo painel conjunto, personalizado.
                </p>
                <p>Ao aceitar este convite, vocês permitem que {advisorName}:</p>
              </>
            ) : (
              <>
                <p>
                  Seja bem-vindo(a) à Flynance, a nossa nova plataforma de controle orçamentário.
                  Aqui vamos controlar as suas finanças pela inteligência artificial da Fly no
                  WhatsApp e pelo seu painel personalizado.
                </p>
                <p>Ao aceitar este convite, você permite que {advisorName}:</p>
              </>
            )}

            <ul className="list-disc space-y-1 pl-5">
              <li>Visualize valores consolidados de gastos e receitas em tempo real;</li>
              <li>
                Visualize os estabelecimentos em que{' '}
                {accountType === 'COUPLE' ? 'vocês estão' : 'você está'} transacionando;
              </li>
              <li>Visualize relatórios gerados pela Fly;</li>
              <li>Visualize contas fixas mensais cadastradas na Fly;</li>
              <li>Edite categorias e estabeleça limites de gasto;</li>
              <li>Acompanhe a evolução financeira e sugira ajustes no planejamento.</li>
            </ul>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-[#333C4D]">Limites de acesso do Advisor</p>
              <p className="mt-1">{advisorName} não terá acesso a:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                <li>senhas;</li>
                <li>dados completos de cartão;</li>
                <li>CVV;</li>
                <li>credenciais;</li>
                <li>dados bancários sensíveis.</li>
              </ul>
            </div>

            <p>
              Leia nossos{' '}
              <button
                type="button"
                onClick={() => openLegal('termos')}
                className="font-semibold text-primary underline"
              >
                Termos de Uso
              </button>{' '}
              e{' '}
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

        {/* Erros de token inválido */}
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

        {blocked && invite?.status === 'ACCEPTED' && status !== 'authenticated' && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Este convite já foi aceito.{' '}
            <Link href="/login" className="font-semibold underline">
              Ir para login
            </Link>
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

        {/* ── Fluxo por estado ──────────────────────────────────────────────── */}

        {isValidToken && !blocked && (
          <>
            {/* UNAUTHENTICATED: prefill form primeiro */}
            {status === 'unauthenticated' && step === 'prefill' && renderPrefillForm()}
            {status === 'unauthenticated' && step === 'checking' && (
              <div className="mt-5 h-24 animate-pulse rounded-xl bg-slate-100" />
            )}
            {status === 'unauthenticated' && step === 'existing-login' && renderExistingLoginScreen()}
            {status === 'unauthenticated' && step === 'existing-payment' && renderExistingPaymentScreen()}
            {status === 'unauthenticated' && step === 'signup-otp' && renderOtpVerify()}

            {/* AUTHENTICATED: accept button */}
            {status === 'authenticated' && invite?.status !== 'ACCEPTED' && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={!isValidToken || primaryLoading || blocked || inviteQuery.isLoading}
                  className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
                >
                  {primaryLoading ? 'Confirmando...' : primaryLabel}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Voltar
                </button>
              </div>
            )}

            {/* loading / idle session */}
            {(status === 'idle' || status === 'loading') && (
              <div className="mt-5 h-10 animate-pulse rounded-xl bg-slate-100" />
            )}
          </>
        )}

        {/* Botão voltar nas telas de unauthenticated que não sejam o form principal */}
        {status === 'unauthenticated' && !['prefill', 'checking'].includes(step) && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-slate-500 underline"
            >
              Voltar
            </button>
          </div>
        )}
      </section>

      {/* Welcome popup */}
      {welcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D7EAF5] bg-white p-6 shadow-xl">
            <p className="text-2xl">🎉</p>
            <h2 className="mt-3 text-xl font-semibold text-[#333C4D]">
              Tudo certo! Sua conta foi vinculada ao consultor {resolvedAdvisorName}.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Agora você já pode usar a Fly normalmente com acompanhamento profissional.
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
