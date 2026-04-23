'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlansResponse } from '@/types/plan'
import { CreditCard, Loader2, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

type CouplePlanUpgradeCardProps = {
  plan: PlansResponse | null
  currentPlanName: string | null
  hasActiveSignature: boolean
  isCurrentCouplePlan: boolean
  isLoadingPlans: boolean
  plansErrorMessage?: string | null
  isPendingUpgrade: boolean
  canManageUpgrade: boolean
  onUpgrade: () => void
}

function formatPlanPrice(plan: PlansResponse, locale: string) {
  return new Intl.NumberFormat(locale || 'pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
  }).format(plan.priceCents / 100)
}

export function CouplePlanUpgradeCard({
  plan,
  currentPlanName,
  hasActiveSignature,
  isCurrentCouplePlan,
  isLoadingPlans,
  plansErrorMessage,
  isPendingUpgrade,
  canManageUpgrade,
  onUpgrade,
}: CouplePlanUpgradeCardProps) {
  const t = useTranslations('coupleAccountPage')
  const locale = useLocale()

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl text-[#333C4D]">{t('upgradeCard.title')}</CardTitle>
            <p className="mt-1 text-sm text-slate-600">{t('upgradeCard.description')}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoadingPlans ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('upgradeCard.loadingPlans')}
          </div>
        ) : plansErrorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {plansErrorMessage}
          </div>
        ) : !plan ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">{t('upgradeCard.noPlanTitle')}</p>
            <p className="mt-2">{t('upgradeCard.noPlanDescription')}</p>
            <p className="mt-2 text-xs">{t('upgradeCard.noPlanHint')}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-base font-semibold leading-5 text-[#333C4D]">{plan.name}</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <p className="text-3xl font-semibold leading-none text-secondary">
                      {formatPlanPrice(plan, locale)}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-[#D7EAF5] bg-white text-xs font-medium text-[#2F6E91]"
                    >
                      {t(`upgradeCard.periods.${plan.period}`)}
                    </Badge>
                  </div>
                </div>

                {isCurrentCouplePlan && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {t('upgradeCard.activeBadge')}
                  </Badge>
                )}
              </div>

              {currentPlanName && (
                <p className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                  {t('upgradeCard.currentPlan', { planName: currentPlanName })}
                </p>
              )}

              <div className="mt-4 rounded-2xl border border-[#C9DFED] bg-[linear-gradient(135deg,#F8FCFF_0%,#EEF7FC_100%)] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2F4858] text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-[#1E293B]">
                      {canManageUpgrade
                        ? t('upgradeCard.ownerNoteTitle')
                        : t('upgradeCard.partnerNoteTitle')}
                    </p>
                    <p className="text-sm text-[#1E293B]">
                      {canManageUpgrade
                        ? t('upgradeCard.ownerNoteDescription')
                        : t('upgradeCard.partnerNoteDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {canManageUpgrade && !isCurrentCouplePlan && (
              <div className="space-y-3">
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  {t('upgradeCard.prorationNote')}
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={onUpgrade}
                  disabled={isPendingUpgrade}
                >
                  {isPendingUpgrade ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('upgradeCard.processing')}
                    </>
                  ) : hasActiveSignature ? (
                    t('upgradeCard.actions.changePlan')
                  ) : (
                    t('upgradeCard.actions.createSubscription')
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
