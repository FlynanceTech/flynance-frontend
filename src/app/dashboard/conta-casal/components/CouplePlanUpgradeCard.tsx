'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlansResponse } from '@/types/plan'
import { Check, ChevronLeft, ChevronRight, CreditCard, Loader2, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

const COUPLE_MONTHLY_SLUG = 'flynance-casal'
const COUPLE_ANNUAL_SLUG = 'flynance-casal-anual'
const COUPLE_PLAN_SLUGS = new Set([COUPLE_MONTHLY_SLUG, COUPLE_ANNUAL_SLUG])
const COUPLE_MONTHLY_PRICE_CENTS = 3290
const COUPLE_ANNUAL_TOTAL_CENTS = 32280
const COUPLE_ANNUAL_INSTALLMENT_CENTS = 2690

type CouplePlanUpgradeCardProps = {
  plans: PlansResponse[]
  currentPlanName: string | null
  currentPlanId?: string | null
  currentPlanPriceCents?: number | null
  hasActiveSignature: boolean
  isLoadingPlans: boolean
  plansErrorMessage?: string | null
  isPendingUpgrade: boolean
  canManageUpgrade: boolean
  onUpgrade: (planId: string) => void
}

function normalizePlanSlug(plan: Pick<PlansResponse, 'slug'>) {
  return String(plan.slug ?? '').trim().toLowerCase()
}

function isCanonicalCouplePlan(plan: PlansResponse) {
  return COUPLE_PLAN_SLUGS.has(normalizePlanSlug(plan))
}

function isAnnualCouplePlan(plan: PlansResponse) {
  return normalizePlanSlug(plan) === COUPLE_ANNUAL_SLUG
}

function getDisplayPriceCents(plan: PlansResponse) {
  const slug = normalizePlanSlug(plan)
  if (slug === COUPLE_MONTHLY_SLUG) return COUPLE_MONTHLY_PRICE_CENTS
  if (slug === COUPLE_ANNUAL_SLUG) return COUPLE_ANNUAL_INSTALLMENT_CENTS
  return plan.priceCents
}

function getPlanChargePriceCents(plan: PlansResponse) {
  const slug = normalizePlanSlug(plan)
  if (slug === COUPLE_MONTHLY_SLUG) return COUPLE_MONTHLY_PRICE_CENTS
  if (slug === COUPLE_ANNUAL_SLUG) return COUPLE_ANNUAL_TOTAL_CENTS
  return plan.priceCents
}

function formatDisplayPlanPrice(plan: PlansResponse, locale: string) {
  return formatCurrencyFromCents(getDisplayPriceCents(plan), plan.currency || 'BRL', locale)
}

function formatCurrencyFromCents(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale || 'pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
  }).format(cents / 100)
}

function getPlanPeriodKey(period: unknown) {
  if (period === 'WEEKLY' || period === 'MONTHLY' || period === 'YEARLY') {
    return `upgradeCard.periods.${period}` as const
  }

  return null
}

function getPlanBenefits(plan: PlansResponse, fallback: string[]) {
  const features = Array.isArray(plan.features)
    ? plan.features
        .map((feature) => String(feature.label || feature.value || '').trim())
        .filter(Boolean)
    : []

  return features.length > 0 ? features.slice(0, 4) : fallback
}

export function CouplePlanUpgradeCard({
  plans,
  currentPlanName,
  currentPlanId,
  currentPlanPriceCents,
  hasActiveSignature,
  isLoadingPlans,
  plansErrorMessage,
  isPendingUpgrade,
  canManageUpgrade,
  onUpgrade,
}: CouplePlanUpgradeCardProps) {
  const t = useTranslations('coupleAccountPage')
  const locale = useLocale()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const visiblePlans = useMemo(
    () =>
      [...plans].filter(isCanonicalCouplePlan).sort((a, b) => {
        const periodOrder = { MONTHLY: 0, YEARLY: 1, WEEKLY: 2 } as const
        const left = periodOrder[a.period as keyof typeof periodOrder] ?? 99
        const right = periodOrder[b.period as keyof typeof periodOrder] ?? 99
        return left - right || getPlanChargePriceCents(a) - getPlanChargePriceCents(b)
      }),
    [plans]
  )
  const effectiveSelectedIndex = Math.min(selectedIndex, Math.max(visiblePlans.length - 1, 0))
  const plan = visiblePlans[effectiveSelectedIndex] ?? null
  const hasMultiplePlans = visiblePlans.length > 1
  const isCurrentCouplePlan = Boolean(plan?.id && currentPlanId && plan.id === currentPlanId && hasActiveSignature)

  const couplePlanPriceLabel = plan ? formatDisplayPlanPrice(plan, locale) : ''
  const hasPositiveDifference =
    plan != null &&
    typeof currentPlanPriceCents === 'number' &&
    Number.isFinite(currentPlanPriceCents) &&
    getPlanChargePriceCents(plan) > currentPlanPriceCents
  const differenceAmountLabel = hasPositiveDifference
    ? formatCurrencyFromCents(
        getPlanChargePriceCents(plan!) - (currentPlanPriceCents as number),
        plan!.currency || 'BRL',
        locale
      )
    : ''
  const planPeriodKey = plan ? getPlanPeriodKey(plan.period) : null
  const planPeriodFallback = plan ? String(plan.period ?? '').trim() || '-' : '-'
  const isAnnualPlan = plan ? isAnnualCouplePlan(plan) : false
  const annualTotalLabel = plan
    ? formatCurrencyFromCents(COUPLE_ANNUAL_TOTAL_CENTS, plan.currency || 'BRL', locale)
    : ''
  const annualInstallmentLabel = plan
    ? formatCurrencyFromCents(COUPLE_ANNUAL_INSTALLMENT_CENTS, plan.currency || 'BRL', locale)
    : ''
  const benefits = plan ? getPlanBenefits(plan, [
    t('upgradeCard.benefits.sharedDashboard'),
    t('upgradeCard.benefits.partnerTracking'),
    t('upgradeCard.benefits.sharedAi'),
  ]) : []

  function showPreviousPlan() {
    if (!hasMultiplePlans) return
    setSelectedIndex((current) => (current === 0 ? visiblePlans.length - 1 : current - 1))
  }

  function showNextPlan() {
    if (!hasMultiplePlans) return
    setSelectedIndex((current) => (current + 1) % visiblePlans.length)
  }

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
        ) : visiblePlans.length === 0 || !plan ? (
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
                      {formatDisplayPlanPrice(plan, locale)}
                    </p>
                    {isAnnualPlan && (
                      <span className="pb-0.5 text-sm font-semibold leading-5 text-secondary">
                        {t('upgradeCard.annualInstallmentSuffix')}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className="border-[#D7EAF5] bg-white text-xs font-medium text-[#2F6E91]"
                    >
                      {planPeriodKey ? t(planPeriodKey) : planPeriodFallback}
                    </Badge>
                  </div>
                </div>

                {isCurrentCouplePlan && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {t('upgradeCard.activeBadge')}
                  </Badge>
                )}
              </div>

              {hasMultiplePlans && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" size="icon" onClick={showPreviousPlan} aria-label={t('upgradeCard.carousel.previous')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {visiblePlans.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          'h-2 rounded-full transition-all ' +
                          (index === effectiveSelectedIndex ? 'w-6 bg-primary' : 'w-2 bg-slate-300')
                        }
                        aria-label={t('upgradeCard.carousel.goTo', { index: index + 1 })}
                        onClick={() => setSelectedIndex(index)}
                      />
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={showNextPlan} aria-label={t('upgradeCard.carousel.next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {currentPlanName && (
                <p className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                  {t('upgradeCard.currentPlan', { planName: currentPlanName })}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2 text-sm leading-5 text-[#1E293B]">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

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
                  {isAnnualPlan
                    ? t('upgradeCard.annualBillingNote', {
                        upfrontPrice: annualTotalLabel,
                        installmentPrice: annualInstallmentLabel,
                      })
                    : hasPositiveDifference
                    ? t('upgradeCard.prorationNote', {
                        differenceAmount: differenceAmountLabel,
                        couplePlanPrice: couplePlanPriceLabel,
                      })
                    : t('upgradeCard.prorationNoteSimple', {
                        couplePlanPrice: couplePlanPriceLabel,
                      })}
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => onUpgrade(plan.id)}
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
