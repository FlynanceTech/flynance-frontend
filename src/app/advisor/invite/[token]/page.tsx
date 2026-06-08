'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, LogOut, UserCheck } from 'lucide-react'
import { acceptAdvisorInvite } from '@/services/advisor'
import { useUserSession } from '@/stores/useUserSession'
import { canAccessAdvisorRole } from '@/utils/roles'
import { useTranslations } from 'next-intl'

function isEmailMismatch(msg: string) {
  return /email.*match|email.*diferente|email.*incorreto|wrong.*email/i.test(msg)
}

export default function AdvisorInviteAcceptPage() {
  const t = useTranslations('advisorInvitePage')
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const tokenFromPath = String(params?.token ?? '').trim()
  const tokenFromQuery = String(searchParams.get('token') ?? '').trim()
  const token = useMemo(() => {
    if (tokenFromQuery.length >= 10) return tokenFromQuery
    return tokenFromPath
  }, [tokenFromPath, tokenFromQuery])
  const invitePath = useMemo(() => {
    if (tokenFromQuery.length >= 10) return `/advisor/invite/accept?token=${tokenFromQuery}`
    return `/advisor/invite/${token}`
  }, [token, tokenFromQuery])

  const { status, fetchAccount, logout, user } = useUserSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [emailMismatch, setEmailMismatch] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const currentEmail = user?.userData?.user?.email ?? ''
  const canAccept = token.length >= 10
  const nextToLogin = useMemo(
    () => `/advisor/login?next=${encodeURIComponent(invitePath)}`,
    [invitePath]
  )

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  const handleAccept = async () => {
    if (!canAccept || isSubmitting) return
    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      router.push(nextToLogin)
      return
    }

    setError('')
    setEmailMismatch(false)
    setIsSubmitting(true)
    try {
      await acceptAdvisorInvite(token)
      await fetchAccount()
      setAccepted(true)
      const role = useUserSession.getState().user?.userData?.user?.role
      if (canAccessAdvisorRole(role)) {
        router.replace('/advisor')
      } else {
        router.replace('/dashboard')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('errors.acceptFailed')
      if (isEmailMismatch(msg)) {
        setEmailMismatch(true)
      } else {
        setError(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSwitchAccount() {
    try {
      setLoggingOut(true)
      await logout()
      router.push(nextToLogin)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))] transition-colors">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-[#333C4D]">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t('subtitle')}
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium">{t('termsTitle')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t('terms.actWithinPermissions')}</li>
            <li>{t('terms.respectPrivacy')}</li>
            <li>{t('terms.auditAware')}</li>
          </ul>
        </div>

        {!canAccept && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('invalidToken')}
          </div>
        )}

        {/* Email mismatch — wrong account */}
        {emailMismatch && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Conta incorreta</p>
            <p className="mt-1">
              Este convite foi enviado para outro e-mail.
              {currentEmail && (
                <> Você está logado como <span className="font-semibold">{currentEmail}</span>.</>
              )}
            </p>
            <p className="mt-1">Saia da conta atual e faça login com o e-mail para o qual o convite foi enviado.</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSwitchAccount}
                disabled={loggingOut}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                {loggingOut ? 'Saindo…' : 'Sair e trocar de conta'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {accepted && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {t('acceptedRedirecting')}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!canAccept || isSubmitting || status === 'idle' || status === 'loading' || emailMismatch}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
          >
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />{t('accepting')}</>
              : <><UserCheck className="h-4 w-4" />{t('acceptInvite')}</>
            }
          </button>

          {status === 'unauthenticated' && (
            <Link
              href={nextToLogin}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center"
            >
              {t('login')}
            </Link>
          )}

          <Link
            href="/dashboard"
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center"
          >
            {t('back')}
          </Link>
        </div>
      </section>
    </main>
  )
}
