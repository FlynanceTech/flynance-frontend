'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { useTranslations } from 'next-intl'

import { useAcceptHouseInvite } from '@/hooks/query/useHouse'
import { getHouseInvitePreview, type HouseInvitePreview } from '@/services/houses'
import { useUserSession } from '@/stores/useUserSession'

export default function CoupleInviteAcceptPage() {
  const t = useTranslations('coupleInvitePage')
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '').trim()
  const acceptInviteMutation = useAcceptHouseInvite()
  const { status, fetchAccount } = useUserSession()
  const [invitePreview, setInvitePreview] = useState<HouseInvitePreview | null>(null)
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
