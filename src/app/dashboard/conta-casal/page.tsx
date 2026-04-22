'use client'

import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCouplePlan,
  useCouplePlanUpgrade,
  useCreateHouse,
  useCreateHouseInvite,
  useHouseContext,
  useRemoveHousePartner,
} from '@/hooks/query/useHouse'
import { useUserSession } from '@/stores/useUserSession'
import type { HouseInvite } from '@/types/house'

import { CouplePlanUpgradeCard } from './components/CouplePlanUpgradeCard'
import { HouseEmptyState } from './components/HouseEmptyState'
import { HouseOverviewCard } from './components/HouseOverviewCard'
import { HousePartnerCard } from './components/HousePartnerCard'
import { PendingInviteCard } from './components/PendingInviteCard'
import { RemovePartnerDialog } from './components/RemovePartnerDialog'
import { getCounterpartMember, getHouseMemberDisplayName, resolveHouseInviteLink } from './components/house-utils'

function CoupleAccountSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}

function mergeHouseInvites(
  currentInvites: HouseInvite[],
  nextInvite: HouseInvite | null
): HouseInvite[] {
  if (!nextInvite) return currentInvites

  const remainingInvites = currentInvites.filter((invite) => invite.id !== nextInvite.id)
  return [nextInvite, ...remainingInvites]
}

function getHouseInviteStorageKey(houseId?: string | null) {
  const safeHouseId = String(houseId ?? '').trim()
  return safeHouseId ? `house-pending-invites:${safeHouseId}` : null
}

export default function CoupleAccountPage() {
  const t = useTranslations('coupleAccountPage')
  const user = useUserSession((state) => state.user)
  const houseQuery = useHouseContext(Boolean(user?.userData?.user?.id))
  const couplePlanQuery = useCouplePlan()
  const createHouseMutation = useCreateHouse()
  const createInviteMutation = useCreateHouseInvite()
  const removePartnerMutation = useRemoveHousePartner()
  const upgradeMutation = useCouplePlanUpgrade()

  const [baseUrl, setBaseUrl] = useState<string>('')
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [generatedInvites, setGeneratedInvites] = useState<HouseInvite[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setBaseUrl(window.location.origin)
  }, [])

  const house = houseQuery.data

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storageKey = getHouseInviteStorageKey(house?.id)
    if (!storageKey) {
      setGeneratedInvites([])
      return
    }

    try {
      const rawValue = window.sessionStorage.getItem(storageKey)
      if (!rawValue) return

      const parsedInvites = JSON.parse(rawValue)
      if (!Array.isArray(parsedInvites)) return

      setGeneratedInvites(
        parsedInvites.filter((invite): invite is HouseInvite => {
          return Boolean(invite && typeof invite === 'object' && typeof invite.id === 'string')
        })
      )
    } catch {
      window.sessionStorage.removeItem(storageKey)
    }
  }, [house?.id])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storageKey = getHouseInviteStorageKey(house?.id)
    if (!storageKey) return

    if (!house?.invites?.length) {
      if (generatedInvites.length > 0) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(generatedInvites))
      }
      return
    }

    setGeneratedInvites((currentInvites) => {
      const remainingInvites = currentInvites.filter(
        (generatedInvite) => !house.invites.some((houseInvite) => houseInvite.id === generatedInvite.id)
      )

      if (remainingInvites.length === 0) {
        window.sessionStorage.removeItem(storageKey)
      } else {
        window.sessionStorage.setItem(storageKey, JSON.stringify(remainingInvites))
      }

      return remainingInvites
    })
  }, [generatedInvites, house?.id, house?.invites])
  const visibleInvites = useMemo(() => {
    return generatedInvites.reduce(
      (accumulator, invite) => mergeHouseInvites(accumulator, invite),
      house?.invites ?? []
    )
  }, [generatedInvites, house?.invites])
  const couplePlan = couplePlanQuery.couplePlan
  const currentPlanId = user?.userData?.signature?.planId ?? null
  const currentPlanName =
    (user?.userData?.signature?.plan as any)?.name ??
    (user?.userData?.signature?.plan as any)?.title ??
    null
  const hasActiveSignature = user?.userData?.hasActiveSignature ?? false
  const canManageHouse = house?.role === 'OWNER'
  const counterpartMember = house ? getCounterpartMember(house) : null
  const counterpartName = getHouseMemberDisplayName(
    counterpartMember,
    t('partnerCard.fallbacks.noName')
  )
  const isCurrentCouplePlan = useMemo(() => {
    if (!couplePlan?.id || !currentPlanId) return false
    return couplePlan.id === currentPlanId && hasActiveSignature
  }, [couplePlan?.id, currentPlanId, hasActiveSignature])

  const isInitialLoading = houseQuery.isLoading && houseQuery.data === undefined

  const handleRefresh = async () => {
    await Promise.all([houseQuery.refetch(), couplePlanQuery.refetch()])
  }

  const handleCreateHouse = async (name: string) => {
    await createHouseMutation.mutateAsync({ name })
  }

  const handleGenerateInvite = async () => {
    const invite = await createInviteMutation.mutateAsync()
    if (!invite) return

    setGeneratedInvites((currentInvites) => {
      const nextInvites = mergeHouseInvites(currentInvites, invite)
      const storageKey = getHouseInviteStorageKey(house?.id)

      if (typeof window !== 'undefined' && storageKey) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(nextInvites))
      }

      return nextInvites
    })

    const link = resolveHouseInviteLink(invite, baseUrl)
    if (!link) return

    try {
      await navigator.clipboard.writeText(link)
      toast.success(t('invitesCard.copySuccess'))
    } catch {
      toast.error(t('invitesCard.copyError'))
    }
  }

  const handleCopyInvite = async (invite: HouseInvite) => {
    const link = resolveHouseInviteLink(invite, baseUrl)
    if (!link) {
      toast.error(t('invitesCard.copyUnavailable'))
      return
    }

    try {
      await navigator.clipboard.writeText(link)
      toast.success(t('invitesCard.copySuccess'))
    } catch {
      toast.error(t('invitesCard.copyError'))
    }
  }

  const handleUpgrade = async () => {
    if (!couplePlan?.id) {
      toast.error(t('upgradeCard.noPlanTitle'))
      return
    }

    await upgradeMutation.mutateAsync(couplePlan.id)
  }

  const handleRemovePartner = async () => {
    try {
      await removePartnerMutation.mutateAsync()
      setRemoveDialogOpen(false)
    } catch {
      // feedback tratado no hook
    }
  }

  const showFatalError = houseQuery.isError && !house

  return (
    <section className="w-full overflow-y-auto px-4 pb-28 pt-6 md:px-6 lg:pr-8 lg:pb-6 lg:pt-0">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-[#333C4D] dark:text-white md:text-2xl">{t('title')}</h1>
              <p className="text-sm text-slate-600 dark:text-zinc-300">{t('subtitle')}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleRefresh}
              disabled={houseQuery.isFetching || couplePlanQuery.isFetching}
            >
              {houseQuery.isFetching || couplePlanQuery.isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('refreshing')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t('refresh')}
                </>
              )}
            </Button>
          </div>
        </article>

        {isInitialLoading ? (
          <CoupleAccountSkeleton />
        ) : showFatalError ? (
          <article className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">{t('loadError.title')}</p>
                <p className="mt-1">
                  {houseQuery.error instanceof Error
                    ? houseQuery.error.message
                    : t('loadError.description')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full sm:w-auto"
                  onClick={handleRefresh}
                >
                  {t('retry')}
                </Button>
              </div>
            </div>
          </article>
        ) : !house ? (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <HouseEmptyState
              isPending={createHouseMutation.isPending}
              onCreate={handleCreateHouse}
            />

            <CouplePlanUpgradeCard
              plan={couplePlan}
              currentPlanName={currentPlanName}
              hasActiveSignature={hasActiveSignature}
              isCurrentCouplePlan={isCurrentCouplePlan}
              isLoadingPlans={couplePlanQuery.isLoading}
              plansErrorMessage={
                couplePlanQuery.error instanceof Error ? couplePlanQuery.error.message : null
              }
              isPendingUpgrade={upgradeMutation.isPending}
              canManageUpgrade
              onUpgrade={handleUpgrade}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <HouseOverviewCard house={house} />

              <CouplePlanUpgradeCard
                plan={couplePlan}
                currentPlanName={currentPlanName}
                hasActiveSignature={hasActiveSignature}
                isCurrentCouplePlan={isCurrentCouplePlan}
                isLoadingPlans={couplePlanQuery.isLoading}
                plansErrorMessage={
                  couplePlanQuery.error instanceof Error ? couplePlanQuery.error.message : null
                }
                isPendingUpgrade={upgradeMutation.isPending}
                canManageUpgrade={canManageHouse}
                onUpgrade={handleUpgrade}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <HousePartnerCard
                house={house}
                canManagePartner={canManageHouse && Boolean(counterpartMember)}
                isRemoving={removePartnerMutation.isPending}
                onRequestRemove={() => setRemoveDialogOpen(true)}
              />

              <PendingInviteCard
                invites={visibleInvites}
                canManageInvites={canManageHouse}
                isGenerating={createInviteMutation.isPending}
                baseUrl={baseUrl}
                onCopyInvite={handleCopyInvite}
                onGenerateInvite={handleGenerateInvite}
              />
            </div>
          </>
        )}
      </div>

      <RemovePartnerDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={handleRemovePartner}
        isPending={removePartnerMutation.isPending}
        partnerName={counterpartName}
      />
    </section>
  )
}
