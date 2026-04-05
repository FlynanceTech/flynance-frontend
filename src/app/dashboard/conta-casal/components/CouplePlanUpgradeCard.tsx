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
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#333C4D]">{plan.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatPlanPrice(plan, locale)} · {t(`upgradeCard.periods.${plan.period}`)}
                  </p>
                </div>

                {isCurrentCouplePlan && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {t('upgradeCard.activeBadge')}
                  </Badge>
                )}
              </div>

              {currentPlanName && (
                <p className="mt-3 text-xs text-slate-500">
                  {t('upgradeCard.currentPlan', { planName: currentPlanName })}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white p-2 text-[#2F6E91]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#333C4D]">
                    {canManageUpgrade
                      ? t('upgradeCard.ownerNoteTitle')
                      : t('upgradeCard.partnerNoteTitle')}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {canManageUpgrade
                      ? t('upgradeCard.ownerNoteDescription')
                      : t('upgradeCard.partnerNoteDescription')}
                  </p>
                </div>
              </div>
            </div>

            {canManageUpgrade && !isCurrentCouplePlan && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">{t('upgradeCard.prorationNote')}</p>
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
