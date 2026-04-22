'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { useTranslations } from 'next-intl'

import { useAcceptHouseInvite } from '@/hooks/query/useHouse'
import { useUserSession } from '@/stores/useUserSession'

export default function CoupleInviteAcceptPage() {
  const t = useTranslations('coupleInvitePage')
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '').trim()
  const acceptInviteMutation = useAcceptHouseInvite()
  const { status, fetchAccount } = useUserSession()

  const isValidToken = token.length >= 6
  const nextToLogin = useMemo(
    () => `/login?next=${encodeURIComponent(`/conta-casal/convite/${token}`)}`,
    [token]
  )

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

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

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))] transition-colors">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121212]">
        <h1 className="text-lg font-semibold text-[#333C4D] dark:text-white">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">{t('subtitle')}</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-zinc-300">{t('intro')}</p>
        <p className="mt-3 text-sm font-medium text-[#333C4D] dark:text-white">{t('ctaText')}</p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
          <p className="font-semibold text-[#333C4D] dark:text-white">{t('whatChangesTitle')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t('whatChanges.sharedAccess')}</li>
            <li>{t('whatChanges.historyRule')}</li>
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

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAcceptInvite}
            disabled={!isValidToken || acceptInviteMutation.isPending || status === 'idle' || status === 'loading'}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F4C542] px-4 text-sm font-semibold text-black hover:bg-[#ffd34f] disabled:opacity-60"
          >
            {acceptInviteMutation.isPending ? t('accepting') : t('acceptInvite')}
          </button>

          {status === 'unauthenticated' && (
            <Link
              href={nextToLogin}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              {t('login')}
            </Link>
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
