'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, AlertCircle, RotateCw, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cancelSignature, undoCancelSignature } from '@/services/payment'
import { useRouter } from 'next/navigation'
import { useUserSession } from '@/stores/useUserSession'
import { persistAuthToken, readPersistedAuthToken } from '@/lib/authSession'
import {
  billingKeys,
  useBillingSubscriptionSummary,
  useCreateBillingSetupIntent,
  useUpdateBillingPaymentMethod,
} from '@/hooks/query/useBilling'
import { resolveSubscriptionNextDueDate } from '@/services/billing'
import { formatCurrency } from '@/utils/formatter'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function toDateLabel(value: string | null | undefined, locale: string): string {
  const parsed = parseDate(value)
  if (!parsed) return '-'
  return parsed.toLocaleDateString(locale || 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function toMoneyLabel(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return formatCurrency(value)
}

function mapStripeStatusToKey(status?: string | null): string {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'active') return 'active'
  if (normalized === 'trialing') return 'trialing'
  if (normalized === 'past_due') return 'past_due'
  if (normalized === 'canceled') return 'canceled'
  if (normalized === 'incomplete') return 'incomplete'
  if (normalized === 'incomplete_expired') return 'incomplete_expired'
  if (normalized === 'unpaid') return 'unpaid'
  if (normalized === 'paused') return 'paused'
  return 'unknown'
}

function mapDbStatusToKey(status?: string | null): string {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'active'
  if (normalized === 'TRIALING') return 'trialing'
  if (normalized === 'PAST_DUE') return 'past_due'
  if (normalized === 'CANCELED') return 'canceled'
  if (normalized === 'INCOMPLETE') return 'incomplete'
  if (normalized === 'INACTIVE') return 'inactive'
  return 'unknown'
}

function formatBrand(brand: string | null | undefined, fallbackLabel: string): string {
  if (!brand) return fallbackLabel
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
}

function formatExpiry(month?: number | null, year?: number | null): string {
  if (!month || !year) return '-'
  const mm = String(month).padStart(2, '0')
  const yy = String(year).slice(-2)
  return `${mm}/${yy}`
}

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

function ChangeCardModalContent({
  onClose,
  onCompleted,
  subscriptionId,
}: ChangeCardModalContentProps) {
  const t = useTranslations('profile.subscriptionCard.changeCardModal')
  const stripe = useStripe()
  const elements = useElements()
  const createSetupIntentMutation = useCreateBillingSetupIntent()
  const updatePaymentMethodMutation = useUpdateBillingPaymentMethod()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      toast.error(t('errors.stripeNotLoaded'))
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      toast.error(t('errors.cardFieldNotLoaded'))
      return
    }

    setIsSubmitting(true)
    try {
      const setupIntent = await createSetupIntentMutation.mutateAsync()
      const confirmation = await stripe.confirmCardSetup(setupIntent.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (confirmation.error) {
        throw new Error(confirmation.error.message || t('errors.cardValidationFailed'))
      }

      const paymentMethod = confirmation.setupIntent?.payment_method
      const paymentMethodId =
        typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id

      if (!paymentMethodId) {
        throw new Error(t('errors.paymentMethodMissing'))
      }

      await updatePaymentMethodMutation.mutateAsync({
        paymentMethodId,
        subscriptionId: subscriptionId || undefined,
      })

      await onCompleted()
      toast.success(t('success.updated'))
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.updateFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const pending =
    isSubmitting || createSetupIntentMutation.isPending || updatePaymentMethodMutation.isPending

  return (
    <DialogPanel className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
      <DialogTitle className="text-lg font-semibold text-[#333C4D]">{t('title')}</DialogTitle>
      <p className="mt-1 text-sm text-slate-600">{t('description')}</p>

      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': { color: '#94a3b8' },
              },
              invalid: {
                color: '#dc2626',
              },
            },
          }}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          {t('actions.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('actions.updating')}
            </span>
          ) : (
            t('actions.saveCard')
          )}
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

function ChangeCardModal({
  open,
  onClose,
  onCompleted,
  subscriptionId,
}: ChangeCardModalProps) {
  if (!stripePromise) return null

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Elements stripe={stripePromise}>
          <ChangeCardModalContent
            onClose={onClose}
            onCompleted={onCompleted}
            subscriptionId={subscriptionId}
          />
        </Elements>
      </div>
    </Dialog>
  )
}

const SubscriptionCard = () => {
  const t = useTranslations('profile.subscriptionCard')
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, status, fetchAccount } = useUserSession()
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [loadingReactivate, setLoadingReactivate] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [isChangeCardOpen, setIsChangeCardOpen] = useState(false)

  const userId = user?.userData?.user?.id
  const summaryQuery = useBillingSubscriptionSummary(Boolean(userId), userId)

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  const summary = summaryQuery.data
  const db = summary?.db
  const stripe = summary?.stripe
  const paymentMethod = summary?.paymentMethod
  const planName = db?.plan?.name || t('planFallback')

  const normalizedStripeStatus = String(stripe?.status ?? '').toLowerCase()
  const normalizedDbStatus = String(db?.status ?? '').toUpperCase()
  const statusLabel = stripe
    ? t(`status.${mapStripeStatusToKey(stripe.status)}`)
    : t(`status.${mapDbStatusToKey(db?.status)}`)
  const isCancelled =
    normalizedStripeStatus === 'canceled' || normalizedDbStatus === 'CANCELED'
  const isActive =
    normalizedStripeStatus === 'active' ||
    normalizedStripeStatus === 'trialing' ||
    Boolean(db?.active)
  const cancelAtPeriodEnd = Boolean(stripe?.cancelAtPeriodEnd ?? db?.cancelAtPeriodEnd)
  const scheduledToCancel = isActive && !isCancelled && cancelAtPeriodEnd
  const nextDueDate = resolveSubscriptionNextDueDate(summary)
  const endedAt = db?.endDate ?? stripe?.canceledAt ?? null
  const sessionSignatureId = user?.userData?.signature?.id ?? null
  const signatureCandidates = useMemo(
    () => uniqueIds(sessionSignatureId, db?.signatureId),
    [sessionSignatureId, db?.signatureId]
  )
  const subscriptionId = stripe?.id ?? db?.subscriptionId ?? undefined

  const refreshSubscriptionSummary = async () => {
    await queryClient.invalidateQueries({
      queryKey: billingKeys.subscriptionSummaryRoot,
      refetchType: 'active',
    })
    await summaryQuery.refetch()
  }

  const statusBadgeClass = useMemo(() => {
    if (isActive && !isCancelled) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }, [isActive, isCancelled])

  const handleCancelSubscription = async () => {
    if (!signatureCandidates.length) {
      toast.error(t('toasts.subscriptionIdNotFoundCancel'))
      return
    }
    try {
      setLoadingCancel(true)
      let canceled = false
      let lastError: unknown = null

      for (const candidateId of signatureCandidates) {
        try {
          await cancelSignature(candidateId)
          canceled = true
          break
        } catch (error: unknown) {
          lastError = error
        }
      }

      if (!canceled) {
        throw lastError ?? new Error(t('toasts.cancelError'))
      }

      await fetchAccount()
      await refreshSubscriptionSummary()
      toast.success(t('toasts.cancelRequested'))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('toasts.cancelError'))
    } finally {
      setLoadingCancel(false)
      setConfirmingCancel(false)
    }
  }

  const handleUndoCancel = async () => {
    if (!signatureCandidates.length) {
      toast.error(t('toasts.subscriptionIdNotFoundReactivate'))
      return
    }
    try {
      setLoadingReactivate(true)
      let restored = false
      let lastError: unknown = null

      for (const candidateId of signatureCandidates) {
        try {
          await undoCancelSignature(candidateId)
          restored = true
          break
        } catch (error: unknown) {
          lastError = error
        }
      }

      if (!restored) {
        throw lastError ?? new Error(t('toasts.reactivateError'))
      }

      await fetchAccount()
      await refreshSubscriptionSummary()
      toast.success(t('toasts.cancelUndoSuccess'))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('toasts.cancelUndoError'))
    } finally {
      setLoadingReactivate(false)
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      setLoadingReactivate(true)
      router.push('/WinbackPage/planos')
    } finally {
      setLoadingReactivate(false)
    }
  }

  if (status === 'idle' || status === 'loading' || summaryQuery.isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('loading')}
        </div>
      </div>
    )
  }

  if (summaryQuery.isError) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        </div>
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {t('loadError.title')}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : t('loadError.description')}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => summaryQuery.refetch()}>
              {t('actions.retry')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!summary?.hasSubscription || !db) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('emptyState')}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6  shadow-sm animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/15">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-foreground">{planName}</h3>
              <Badge variant="outline" className={statusBadgeClass}>
                {statusLabel}
              </Badge>
              {scheduledToCancel && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                  {t('badges.cancelAtPeriodEnd')}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {summary.source
                ? t('valueWithSource', { value: toMoneyLabel(db.value), source: summary.source })
                : t('valueOnly', { value: toMoneyLabel(db.value) })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('nextBilling', { date: toDateLabel(nextDueDate, locale) })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('cancelAtPeriodEndLabel', {
                value: cancelAtPeriodEnd ? t('common.yes') : t('common.no'),
              })}
            </p>
            {endedAt && isCancelled && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('endedAt', { date: toDateLabel(endedAt, locale) })}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1F2A37]">{t('card.currentTitle')}</p>
              {paymentMethod ? (
                <div className="mt-1 text-sm text-slate-700">
                  <p>
                    {formatBrand(paymentMethod.brand, t('card.fallbackBrand'))} ****
                    {paymentMethod.last4 || '----'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('card.expiry', {
                      value: formatExpiry(paymentMethod.expMonth, paymentMethod.expYear),
                    })}
                    {paymentMethod.funding ? ` - ${paymentMethod.funding}` : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  {t('card.noCard')}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Button
                variant="default"
                onClick={() => {
                  if (!stripePromise) {
                    toast.error(t('toasts.stripeMissingFrontendKey'))
                    return
                  }
                  setIsChangeCardOpen(true)
                }}
              >
                {t('card.changeButton')}
              </Button>
              <p className="text-xs text-slate-500">
                {t('card.changeHint')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {scheduledToCancel && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('scheduledCancel.description')}
              </p>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={handleUndoCancel}
                  disabled={loadingReactivate}
                >
                  {loadingReactivate ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('actions.updating')}
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      {t('actions.undoCancel')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {isActive && !isCancelled && !scheduledToCancel && (
            <>
              {!confirmingCancel ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => setConfirmingCancel(true)}
                    disabled={loadingCancel}
                  >
                    {t('actions.cancelSubscription')}
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const token = readPersistedAuthToken()
                      if (!token) {
                        toast.error(t('toasts.sessionExpired'))
                        return
                      }
                      persistAuthToken(token)
                      router.push('/WinbackPage/planos')
                    }}
                  >
                    {t('actions.changeSubscription')}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-3">
                  <p className="text-xs text-slate-700">
                    {t('cancelConfirm.description')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={loadingCancel}
                    >
                      {t('cancelConfirm.keepSubscription')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancelSubscription}
                      disabled={loadingCancel}
                    >
                      {loadingCancel ? t('actions.cancelling') : t('cancelConfirm.confirm')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {isCancelled && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('cancelled.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={handleReactivateSubscription}
                  disabled={loadingReactivate}
                >
                  {loadingReactivate ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('actions.redirecting')}
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      {t('actions.reactivateSubscription')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

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

