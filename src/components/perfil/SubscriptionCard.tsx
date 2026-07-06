'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, CreditCard, Heart, Loader2, RotateCw, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cancelSignature, undoCancelSignature } from '@/services/payment'
import { useRouter } from 'next/navigation'
import { useUserSession } from '@/stores/useUserSession'
import {
  billingKeys,
  useBillingSubscriptionSummary,
  useCreateBillingSetupIntent,
  useUpdateBillingPaymentMethod,
} from '@/hooks/query/useBilling'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { usePlans } from '@/hooks/query/usePlan'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

type OfficialPlan = {
  slug: string
  displayName: string
  price: string
  isAnnual: boolean
  annualLabel: string
  isCouple: boolean
  benefits: string[]
  checkoutUrl: string
}

const INDIVIDUAL_BENEFITS = [
  'Teste grátis por 30 dias',
  'Assistente IA direto no WhatsApp',
  'Registro de gastos, receitas e categorias ilimitadas',
  'Dashboard financeiro com relatórios da Fly',
]

const COUPLE_BENEFITS = [
  'Teste grátis por 30 dias',
  'Assistente IA direto no WhatsApp para duas pessoas',
  'Registro de gastos, receitas e categorias ilimitadas',
  'Dashboard financeiro e relatórios completos com visão unificada das contas do casal',
]

const OFFICIAL_PLANS: OfficialPlan[] = [
  {
    slug: 'essencial-mensal',
    displayName: 'Fly Essencial - Mensal',
    price: '19,90',
    isAnnual: false,
    annualLabel: '',
    isCouple: false,
    benefits: INDIVIDUAL_BENEFITS,
    checkoutUrl: 'https://flynance.tec.br/cadastro/checkout?plano=essencial-mensal',
  },
  {
    slug: 'essencial-anual-lancamento',
    displayName: 'Fly Essencial - Anual',
    price: '15,92',
    isAnnual: true,
    annualLabel: 'em 12x ou à vista',
    isCouple: false,
    benefits: INDIVIDUAL_BENEFITS,
    checkoutUrl: 'https://flynance.tec.br/cadastro/checkout?plano=essencial-anual-lancamento',
  },
  {
    slug: 'flynance-casal',
    displayName: 'Fly Casal - Mensal',
    price: '34,90',
    isAnnual: false,
    annualLabel: '',
    isCouple: true,
    benefits: COUPLE_BENEFITS,
    checkoutUrl: 'https://flynance.tec.br/cadastro/checkout?plano=flynance-casal',
  },
  {
    slug: 'flynance-casal-anual',
    displayName: 'Fly Casal - Anual',
    price: '26,90',
    isAnnual: true,
    annualLabel: 'em 12x ou à vista',
    isCouple: true,
    benefits: COUPLE_BENEFITS,
    checkoutUrl: 'https://flynance.tec.br/cadastro/checkout?plano=flynance-casal-anual',
  },
]

function uniqueIds(...values: Array<string | null | undefined>): string[] {
  const unique = new Set<string>()
  for (const value of values) {
    const normalized = String(value ?? '').trim()
    if (!normalized) continue
    unique.add(normalized)
  }
  return Array.from(unique)
}

type ChangeCardModalContentProps = {
  onClose: () => void
  onCompleted: () => Promise<void>
  subscriptionId?: string | null
}

function ChangeCardModalContent({ onClose, onCompleted, subscriptionId }: ChangeCardModalContentProps) {
  const t = useTranslations('profile.subscriptionCard.changeCardModal')
  const stripe = useStripe()
  const elements = useElements()
  const createSetupIntentMutation = useCreateBillingSetupIntent()
  const updatePaymentMethodMutation = useUpdateBillingPaymentMethod()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!stripe || !elements) { toast.error(t('errors.stripeNotLoaded')); return }
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) { toast.error(t('errors.cardFieldNotLoaded')); return }

    setIsSubmitting(true)
    try {
      const setupIntent = await createSetupIntentMutation.mutateAsync()
      const confirmation = await stripe.confirmCardSetup(setupIntent.clientSecret, {
        payment_method: { card: cardElement },
      })
      if (confirmation.error) throw new Error(confirmation.error.message || t('errors.cardValidationFailed'))
      const paymentMethod = confirmation.setupIntent?.payment_method
      const paymentMethodId = typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id
      if (!paymentMethodId) throw new Error(t('errors.paymentMethodMissing'))
      await updatePaymentMethodMutation.mutateAsync({ paymentMethodId, subscriptionId: subscriptionId || undefined })
      await onCompleted()
      toast.success(t('success.updated'))
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.updateFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const pending = isSubmitting || createSetupIntentMutation.isPending || updatePaymentMethodMutation.isPending

  return (
    <DialogPanel className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
      <DialogTitle className="text-lg font-semibold text-[#333C4D]">{t('title')}</DialogTitle>
      <p className="mt-1 text-sm text-slate-600">{t('description')}</p>
      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px', color: '#1f2937', '::placeholder': { color: '#94a3b8' } }, invalid: { color: '#dc2626' } } }} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>{t('actions.cancel')}</Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('actions.updating')}</span> : t('actions.saveCard')}
        </Button>
      </div>
    </DialogPanel>
  )
}

type ChangeCardModalProps = {
  open: boolean
  onClose: () => void
  onCompleted: () => Promise<void>
  subscriptionId?: string | null
}

function ChangeCardModal({ open, onClose, onCompleted, subscriptionId }: ChangeCardModalProps) {
  if (!stripePromise) return null
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Elements stripe={stripePromise}>
          <ChangeCardModalContent onClose={onClose} onCompleted={onCompleted} subscriptionId={subscriptionId} />
        </Elements>
      </div>
    </Dialog>
  )
}

type PersonalizeStep = 'options' | 'confirmCancel'

const SubscriptionCard = () => {
  const t = useTranslations('profile.subscriptionCard')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, status, fetchAccount } = useUserSession()
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [loadingReactivate, setLoadingReactivate] = useState(false)
  const [isChangeCardOpen, setIsChangeCardOpen] = useState(false)
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState(false)
  const [personalizeStep, setPersonalizeStep] = useState<PersonalizeStep>('options')
  const [currentIndex, setCurrentIndex] = useState(0)

  const userId = user?.userData?.user?.id
  const summaryQuery = useBillingSubscriptionSummary(Boolean(userId), userId)
  const plansQuery = usePlans()

  useEffect(() => {
    if (status === 'idle') fetchAccount()
  }, [status, fetchAccount])

  const summary = summaryQuery.data
  const db = summary?.db
  const stripe = summary?.stripe
  const sessionSignatureId = user?.userData?.signature?.id ?? null
  const signatureCandidates = useMemo(
    () => uniqueIds(sessionSignatureId, db?.signatureId),
    [sessionSignatureId, db?.signatureId]
  )
  const subscriptionId = stripe?.id ?? db?.subscriptionId ?? undefined

  const normalizedStripeStatus = String(stripe?.status ?? '').toLowerCase()
  const normalizedDbStatus = String(db?.status ?? '').toUpperCase()
  const isCancelled = normalizedStripeStatus === 'canceled' || normalizedDbStatus === 'CANCELED'
  const isActive = normalizedStripeStatus === 'active' || normalizedStripeStatus === 'trialing' || Boolean(db?.active)
  const cancelAtPeriodEnd = Boolean(stripe?.cancelAtPeriodEnd ?? db?.cancelAtPeriodEnd)
  const scheduledToCancel = isActive && !isCancelled && cancelAtPeriodEnd

  const currentPlanId = db?.plan?.id ?? null

  // Find the current plan's slug from API data (only used for badge detection)
  const currentPlanSlug = useMemo(() => {
    if (!currentPlanId || !plansQuery.data) return null
    return plansQuery.data.find((p) => p.id === currentPlanId)?.slug ?? null
  }, [currentPlanId, plansQuery.data])

  // Always show all 4 official plans; put the current one first
  const sortedOfficialPlans = useMemo<OfficialPlan[]>(() => {
    if (!currentPlanSlug) return OFFICIAL_PLANS
    return [
      ...OFFICIAL_PLANS.filter((p) => p.slug === currentPlanSlug),
      ...OFFICIAL_PLANS.filter((p) => p.slug !== currentPlanSlug),
    ]
  }, [currentPlanSlug])

  const refreshSubscriptionSummary = async () => {
    await queryClient.invalidateQueries({ queryKey: billingKeys.subscriptionSummaryRoot, refetchType: 'active' })
    await summaryQuery.refetch()
  }

  const handleCancelSubscription = async () => {
    if (!signatureCandidates.length) { toast.error(t('toasts.subscriptionIdNotFoundCancel')); return }
    try {
      setLoadingCancel(true)
      let canceled = false
      let lastError: unknown = null
      for (const candidateId of signatureCandidates) {
        try { await cancelSignature(candidateId); canceled = true; break } catch (error: unknown) { lastError = error }
      }
      if (!canceled) throw lastError ?? new Error(t('toasts.cancelError'))
      await fetchAccount()
      await refreshSubscriptionSummary()
      toast.success(t('toasts.cancelRequested'))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('toasts.cancelError'))
    } finally {
      setLoadingCancel(false)
      setIsPersonalizeOpen(false)
    }
  }

  const handleUndoCancel = async () => {
    if (!signatureCandidates.length) { toast.error(t('toasts.subscriptionIdNotFoundReactivate')); return }
    try {
      setLoadingReactivate(true)
      let restored = false
      let lastError: unknown = null
      for (const candidateId of signatureCandidates) {
        try { await undoCancelSignature(candidateId); restored = true; break } catch (error: unknown) { lastError = error }
      }
      if (!restored) throw lastError ?? new Error(t('toasts.reactivateError'))
      await fetchAccount()
      await refreshSubscriptionSummary()
      toast.success(t('toasts.cancelUndoSuccess'))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('toasts.cancelUndoError'))
    } finally {
      setLoadingReactivate(false)
      setIsPersonalizeOpen(false)
    }
  }

  const handleReactivate = () => {
    router.push('/WinbackPage/planos')
    setIsPersonalizeOpen(false)
  }

  const openPersonalize = () => {
    setPersonalizeStep('options')
    setIsPersonalizeOpen(true)
  }

  const totalPlans = sortedOfficialPlans.length
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < totalPlans - 1

  const activePlan = sortedOfficialPlans[currentIndex] ?? null
  const isCurrentPlan = activePlan?.slug === currentPlanSlug
  const ActivePlanIcon = activePlan ? (activePlan.isCouple ? Heart : User) : null

  if (status === 'idle' || status === 'loading' || summaryQuery.isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full"><CreditCard className="h-5 w-5 text-primary" /></div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />{t('loading')}
        </div>
      </div>
    )
  }

  if (summaryQuery.isError) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full"><CreditCard className="h-5 w-5 text-primary" /></div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        </div>
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-slate-900">{t('loadError.title')}</p>
            <p className="text-xs text-slate-600 mt-1">{summaryQuery.error instanceof Error ? summaryQuery.error.message : t('loadError.description')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => summaryQuery.refetch()}>{t('actions.retry')}</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full"><CreditCard className="h-5 w-5 text-primary" /></div>
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
      </div>

      {/* Carrossel de planos */}
      {activePlan && (
        <div>
          {/* Card único */}
          <div className={[
            'relative rounded-2xl border-2 p-6 flex flex-col min-h-[340px]',
            isCurrentPlan ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50',
          ].join(' ')}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                {ActivePlanIcon && <ActivePlanIcon className="h-5 w-5 text-primary flex-shrink-0" />}
                <h3 className="text-lg font-bold text-foreground leading-tight">{activePlan.displayName}</h3>
              </div>
              {isCurrentPlan && (
                <span className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full bg-emerald-500 text-white font-semibold whitespace-nowrap">
                  {t('badges.currentPlan')}
                </span>
              )}
            </div>

            {/* Preço */}
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-primary">R$ {activePlan.price}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              {activePlan.isAnnual && activePlan.annualLabel && (
                <p className="mt-0.5 text-xs text-muted-foreground">{activePlan.annualLabel}</p>
              )}
            </div>

            {/* Benefícios */}
            <ul className="space-y-2 flex-1 mb-5">
              {activePlan.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="flex-shrink-0 mt-0.5 h-4 w-4 rounded bg-emerald-400 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </span>
                  <span className="leading-snug">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Botão */}
            {isCurrentPlan ? (
              <button
                type="button"
                onClick={openPersonalize}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-foreground hover:bg-slate-50 transition"
              >
                {t('actions.personalize')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { window.location.href = activePlan.checkoutUrl }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
              >
                {t('actions.changePlanButton')}
              </button>
            )}
          </div>

          {/* Navegação do carrossel */}
          {totalPlans > 1 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={!canGoPrev}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {sortedOfficialPlans.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    className={[
                      'h-2 rounded-full transition-all',
                      i === currentIndex ? 'w-5 bg-primary' : 'w-2 bg-slate-300',
                    ].join(' ')}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(totalPlans - 1, i + 1))}
                disabled={!canGoNext}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de personalização */}
      <Dialog open={isPersonalizeOpen} onClose={() => setIsPersonalizeOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            {personalizeStep === 'options' ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <DialogTitle className="text-lg font-semibold text-foreground">
                    {t('personalizeModal.title')}
                  </DialogTitle>
                  <button type="button" onClick={() => setIsPersonalizeOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {scheduledToCancel ? (
                    <>
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {t('personalizeModal.scheduledCancelNote')}
                      </p>
                      <button
                        type="button"
                        onClick={handleUndoCancel}
                        disabled={loadingReactivate}
                        className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-foreground hover:bg-slate-100 transition disabled:opacity-60"
                      >
                        {loadingReactivate ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4 text-primary" />}
                        {t('personalizeModal.undoCancel')}
                      </button>
                    </>
                  ) : isCancelled ? (
                    <>
                      <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        {t('personalizeModal.cancelledNote')}
                      </p>
                      <button
                        type="button"
                        onClick={handleReactivate}
                        className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition"
                      >
                        <RotateCw className="h-4 w-4" />
                        {t('personalizeModal.reactivate')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPersonalizeOpen(false)
                          if (!stripePromise) { toast.error(t('toasts.stripeMissingFrontendKey')); return }
                          setIsChangeCardOpen(true)
                        }}
                        className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-foreground hover:bg-slate-100 transition"
                      >
                        <CreditCard className="h-4 w-4 text-primary" />
                        {t('personalizeModal.changeCard')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonalizeStep('confirmCancel')}
                        className="w-full flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition"
                      >
                        <X className="h-4 w-4" />
                        {t('personalizeModal.cancelSub')}
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <DialogTitle className="text-lg font-semibold text-foreground">
                    {t('personalizeModal.confirmCancelTitle')}
                  </DialogTitle>
                </div>
                <p className="text-sm text-slate-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  {t('personalizeModal.confirmCancelNote')}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={loadingCancel}
                    className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-60"
                  >
                    {loadingCancel ? t('actions.cancelling') : t('personalizeModal.confirmCancelButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonalizeStep('options')}
                    disabled={loadingCancel}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 transition"
                  >
                    {t('personalizeModal.back')}
                  </button>
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      <ChangeCardModal
        open={isChangeCardOpen}
        onClose={() => setIsChangeCardOpen(false)}
        onCompleted={async () => {
          await refreshSubscriptionSummary()
          await fetchAccount()
        }}
        subscriptionId={subscriptionId}
      />
    </div>
  )
}

export default SubscriptionCard
