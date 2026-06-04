'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { useTranslations } from 'next-intl'

import { useAcceptHouseInvite } from '@/hooks/query/useHouse'
import {
  checkHouseInviteIdentity,
  getHouseInvitePreview,
  signupHouseInvite,
  type HouseInvitePreview,
} from '@/services/houses'
import { useUserSession } from '@/stores/useUserSession'

type InviteStep = 'identity' | 'existing-account' | 'signup' | 'signup-success'

const LOGIN_METHOD_KEY = 'flynance_login_method'
const LOGIN_IDENTIFIER_KEY = 'flynance_login_identifier'

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export default function CoupleInviteAcceptPage() {
  const t = useTranslations('coupleInvitePage')
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '').trim()
  const acceptInviteMutation = useAcceptHouseInvite()
  const { status, fetchAccount } = useUserSession()
  const [invitePreview, setInvitePreview] = useState<HouseInvitePreview | null>(null)
  const [step, setStep] = useState<InviteStep>('identity')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [checkingIdentity, setCheckingIdentity] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [flowError, setFlowError] = useState('')
  const didAutoAccept = useRef(false)

  const isValidToken = token.length >= 6
  const shouldAutoAccept = searchParams.get('autoAccept') === '1'
  const ownerDisplayName = String(invitePreview?.ownerName ?? '').trim()
  const ownerReference = ownerDisplayName || t('fallbackOwner')
  const nextToLogin = useMemo(
    () => {
      const params = new URLSearchParams({
        next: `/conta-casal/convite/${token}?autoAccept=1`,
        reason: 'couple_invite',
      })
      const ownerName = String(invitePreview?.ownerName ?? '').trim()
      if (ownerName) params.set('ownerName', ownerName)
      return `/login?${params.toString()}`
    },
    [invitePreview?.ownerName, token]
  )
  const nextToLoginAfterSignup = useMemo(
    () => {
      const params = new URLSearchParams({
        next: '/dashboard/conta-casal',
        reason: 'couple_invite',
      })
      const ownerName = String(invitePreview?.ownerName ?? '').trim()
      if (ownerName) params.set('ownerName', ownerName)
      return `/login?${params.toString()}`
    },
    [invitePreview?.ownerName]
  )

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  useEffect(() => {
    let cancelled = false
    if (!isValidToken) return

    getHouseInvitePreview(token).then((preview) => {
      if (!cancelled) setInvitePreview(preview)
    })

    return () => {
      cancelled = true
    }
  }, [isValidToken, token])

  useEffect(() => {
    if (!shouldAutoAccept || didAutoAccept.current) return
    if (!isValidToken || status !== 'authenticated') return
    if (acceptInviteMutation.isPending || acceptInviteMutation.isSuccess) return

    didAutoAccept.current = true
    acceptInviteMutation
      .mutateAsync(token)
      .then(() => {
        router.replace('/dashboard/conta-casal')
      })
      .catch(() => {
        didAutoAccept.current = false
      })
  }, [
    acceptInviteMutation,
    isValidToken,
    router,
    shouldAutoAccept,
    status,
    token,
  ])

  const handleAcceptInvite = async () => {
    if (!isValidToken || acceptInviteMutation.isPending) return

    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      router.push(nextToLogin)
      return
    }

    try {
      await acceptInviteMutation.mutateAsync(token)
      router.replace('/dashboard/conta-casal')
    } catch {
      // feedback tratado pelo hook
    }
  }

  const persistLoginIdentifier = () => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(LOGIN_METHOD_KEY, 'whatsapp')
    window.sessionStorage.setItem(LOGIN_IDENTIFIER_KEY, whatsappPhone)
  }

  const goToLogin = (href: string) => {
    persistLoginIdentifier()
    router.push(href)
  }

  const handleCheckIdentity = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValidToken || checkingIdentity) return

    const digits = whatsappPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      setFlowError('Informe um WhatsApp valido para continuar.')
      return
    }

    setCheckingIdentity(true)
    setFlowError('')
    try {
      const result = await checkHouseInviteIdentity({ token, whatsappPhone })
      setStep(result.exists ? 'existing-account' : 'signup')
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Nao foi possivel verificar o WhatsApp.')
    } finally {
      setCheckingIdentity(false)
    }
  }

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValidToken || creatingAccount) return

    if (!acceptedTerms) {
      setFlowError('Voce precisa aceitar os termos para criar a conta.')
      return
    }

    setCreatingAccount(true)
    setFlowError('')
    try {
      await signupHouseInvite({ token, name, email, whatsappPhone })
      setStep('signup-success')
      persistLoginIdentifier()
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Nao foi possivel criar a conta pelo convite.')
    } finally {
      setCreatingAccount(false)
    }
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))] transition-colors">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121212]">
        <h1 className="text-lg font-semibold text-[#333C4D] dark:text-white">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">
          {ownerDisplayName
            ? t('subtitle', { ownerName: ownerDisplayName })
            : t('subtitleFallback')}
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
          <p className="font-semibold text-[#333C4D] dark:text-white">{t('whatChangesTitle')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t('whatChanges.sharedAccess')}</li>
            <li>{t('whatChanges.flyAi')}</li>
            <li>{t('whatChanges.coupleDashboard')}</li>
            <li>{t('whatChanges.launchVisibility', { ownerName: ownerReference })}</li>
            <li>{t('whatChanges.ownerBilling')}</li>
          </ul>
        </div>

        <p className="mt-4 text-sm text-slate-600 dark:text-zinc-300">
          {t('termsPrefix')}{' '}
          <Link href="/termos" target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">
            {t('termsLinkLabel')}
          </Link>{' '}
          {t('termsSuffix')}
        </p>

        {!isValidToken && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('invalidToken')}
          </div>
        )}

        {acceptInviteMutation.isError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {acceptInviteMutation.error instanceof Error
              ? acceptInviteMutation.error.message
              : t('errors.acceptFailed')}
          </div>
        )}

        {acceptInviteMutation.isSuccess && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {t('successRedirecting')}
          </div>
        )}

        {flowError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {flowError}
          </div>
        )}

        {status === 'unauthenticated' && step === 'identity' && (
          <form onSubmit={handleCheckIdentity} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-[#333C4D] dark:text-white" htmlFor="invite-whatsapp">
              Informe seu WhatsApp para continuar
            </label>
            <input
              id="invite-whatsapp"
              type="tel"
              inputMode="numeric"
              value={whatsappPhone}
              onChange={(event) => setWhatsappPhone(formatWhatsApp(event.target.value))}
              placeholder="(54) 99999-9999"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0065A4] dark:border-white/10 dark:bg-white/5 dark:text-white"
              disabled={checkingIdentity}
            />
            <button
              type="submit"
              disabled={!isValidToken || checkingIdentity}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F4C542] px-4 text-sm font-semibold text-black hover:bg-[#ffd34f] disabled:opacity-60"
            >
              {checkingIdentity ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        )}

        {status === 'unauthenticated' && step === 'existing-account' && (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
            <p className="font-semibold">Encontramos uma conta com esse WhatsApp.</p>
            <p className="mt-1">Entre com seu codigo de acesso para aceitar o convite da conta casal.</p>
            <button
              type="button"
              onClick={() => goToLogin(nextToLogin)}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#0065A4] px-4 text-sm font-semibold text-white hover:bg-[#00558A]"
            >
              Fazer login
            </button>
          </div>
        )}

        {status === 'unauthenticated' && step === 'signup' && (
          <form onSubmit={handleSignup} className="mt-5 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Nao encontramos uma conta com esse WhatsApp. Crie sua conta para entrar na conta casal.
            </div>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome completo"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0065A4] dark:border-white/10 dark:bg-white/5 dark:text-white"
              disabled={creatingAccount}
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-mail"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0065A4] dark:border-white/10 dark:bg-white/5 dark:text-white"
              disabled={creatingAccount}
            />
            <input
              type="tel"
              value={whatsappPhone}
              onChange={(event) => setWhatsappPhone(formatWhatsApp(event.target.value))}
              placeholder="WhatsApp"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0065A4] dark:border-white/10 dark:bg-white/5 dark:text-white"
              disabled={creatingAccount}
            />
            <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1"
                disabled={creatingAccount}
              />
              <span>
                Aceito os{' '}
                <Link href="/termos" target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">
                  termos
                </Link>{' '}
                e a{' '}
                <Link href="/privacidade" target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">
                  politica de privacidade
                </Link>
                .
              </span>
            </label>
            <button
              type="submit"
              disabled={creatingAccount}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F4C542] px-4 text-sm font-semibold text-black hover:bg-[#ffd34f] disabled:opacity-60"
            >
              {creatingAccount ? 'Criando conta...' : 'Criar conta e vincular convite'}
            </button>
          </form>
        )}

        {status === 'unauthenticated' && step === 'signup-success' && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Sua conta foi criada e vinculada ao convite.</p>
            <p className="mt-1">Agora entre com o codigo enviado para seu WhatsApp.</p>
            <button
              type="button"
              onClick={() => goToLogin(nextToLoginAfterSignup)}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#0065A4] px-4 text-sm font-semibold text-white hover:bg-[#00558A]"
            >
              Entrar por codigo
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {status === 'authenticated' && (
            <button
              type="button"
              onClick={handleAcceptInvite}
              disabled={!isValidToken || acceptInviteMutation.isPending}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F4C542] px-4 text-sm font-semibold text-black hover:bg-[#ffd34f] disabled:opacity-60"
            >
              {acceptInviteMutation.isPending ? t('accepting') : t('acceptInvite')}
            </button>
          )}

          {status === 'unauthenticated' && step !== 'identity' && step !== 'signup-success' && (
            <button
              type="button"
              onClick={() => setStep('identity')}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              Trocar WhatsApp
            </button>
          )}

          <Link
            href="/dashboard/conta-casal"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
          >
            {t('back')}
          </Link>
        </div>
      </section>
      <Toaster />
    </main>
  )
}
