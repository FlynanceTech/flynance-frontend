'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, AlertCircle, RotateCw, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cancelSignature, undoCancelSignature } from '@/services/payment'
import { useRouter } from 'next/navigation'
import { useUserSession } from '@/stores/useUserSession'
import {
  useBillingSubscriptionSummary,
  useCreateBillingSetupIntent,
  useUpdateBillingPaymentMethod,
} from '@/hooks/query/useBilling'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import toast from 'react-hot-toast'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toBrDate(value?: string | null): string {
  const parsed = parseDate(value)
  if (!parsed) return '-'
  return parsed.toLocaleDateString('pt-BR')
}

function toBrMoney(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function mapStripeStatusToLabel(status?: string | null): string {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'active') return 'Ativa'
  if (normalized === 'trialing') return 'Em teste'
  if (normalized === 'past_due') return 'Em atraso'
  if (normalized === 'canceled') return 'Cancelada'
  if (normalized === 'incomplete') return 'Incompleta'
  if (normalized === 'incomplete_expired') return 'Incompleta (expirada)'
  if (normalized === 'unpaid') return 'Nao paga'
  if (normalized === 'paused') return 'Pausada'
  return normalized || 'Indefinido'
}

function mapDbStatusToLabel(status?: string | null): string {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'Ativa'
  if (normalized === 'TRIALING') return 'Em teste'
  if (normalized === 'PAST_DUE') return 'Em atraso'
  if (normalized === 'CANCELED') return 'Cancelada'
  if (normalized === 'INCOMPLETE') return 'Incompleta'
  if (normalized === 'INACTIVE') return 'Inativa'
  return normalized || 'Indefinido'
}

function formatBrand(brand?: string | null): string {
  if (!brand) return 'Cartao'
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
}

function formatExpiry(month?: number | null, year?: number | null): string {
  if (!month || !year) return '-'
  const mm = String(month).padStart(2, '0')
  const yy = String(year).slice(-2)
  return `${mm}/${yy}`
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
  const stripe = useStripe()
  const elements = useElements()
  const createSetupIntentMutation = useCreateBillingSetupIntent()
  const updatePaymentMethodMutation = useUpdateBillingPaymentMethod()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      toast.error('Stripe ainda nao carregou. Tente novamente.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      toast.error('Nao foi possivel carregar o campo de cartao.')
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
        throw new Error(confirmation.error.message || 'Falha ao validar o cartao.')
      }

      const paymentMethod = confirmation.setupIntent?.payment_method
      const paymentMethodId =
        typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id

      if (!paymentMethodId) {
        throw new Error('Nao foi possivel identificar o metodo de pagamento.')
      }

      await updatePaymentMethodMutation.mutateAsync({
        paymentMethodId,
        subscriptionId: subscriptionId || undefined,
      })

      await onCompleted()
      toast.success('Cartao atualizado para as proximas faturas.')
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao trocar cartao.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pending =
    isSubmitting || createSetupIntentMutation.isPending || updatePaymentMethodMutation.isPending

  return (
    <DialogPanel className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
      <DialogTitle className="text-lg font-semibold text-[#333C4D]">Trocar cartao</DialogTitle>
      <p className="mt-1 text-sm text-slate-600">
        O novo cartao sera usado nas proximas faturas da assinatura.
      </p>

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
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando...
            </span>
          ) : (
            'Salvar cartao'
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
  const router = useRouter()
  const { user, status, fetchAccount } = useUserSession()
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [loadingReactivate, setLoadingReactivate] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [isChangeCardOpen, setIsChangeCardOpen] = useState(false)

  const userId = user?.userData?.user?.id
  const summaryQuery = useBillingSubscriptionSummary(Boolean(userId))

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  const summary = summaryQuery.data
  const db = summary?.db
  const stripe = summary?.stripe
  const paymentMethod = summary?.paymentMethod
  const planName = db?.plan?.name || 'Plano Flynance'

  const normalizedStripeStatus = String(stripe?.status ?? '').toLowerCase()
  const normalizedDbStatus = String(db?.status ?? '').toUpperCase()
  const statusLabel = stripe
    ? mapStripeStatusToLabel(stripe.status)
    : mapDbStatusToLabel(db?.status)
  const isCancelled =
    normalizedStripeStatus === 'canceled' || normalizedDbStatus === 'CANCELED'
  const isActive =
    normalizedStripeStatus === 'active' ||
    normalizedStripeStatus === 'trialing' ||
    Boolean(db?.active)
  const cancelAtPeriodEnd = Boolean(stripe?.cancelAtPeriodEnd ?? db?.cancelAtPeriodEnd)
  const scheduledToCancel = isActive && !isCancelled && cancelAtPeriodEnd
  const nextDueDate = stripe?.currentPeriodEnd ?? db?.nextDueDate
  const endedAt = db?.endDate ?? stripe?.canceledAt ?? null
  const signatureId = db?.signatureId ?? null
  const subscriptionId = stripe?.id ?? db?.subscriptionId ?? undefined

  const statusBadgeClass = useMemo(() => {
    if (isActive && !isCancelled) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }, [isActive, isCancelled])

  const handleCancelSubscription = async () => {
    if (!signatureId) return
    try {
      setLoadingCancel(true)
      await cancelSignature(signatureId)
      await fetchAccount()
      await summaryQuery.refetch()
      toast.success('Cancelamento solicitado com sucesso.')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar assinatura.')
    } finally {
      setLoadingCancel(false)
      setConfirmingCancel(false)
    }
  }

  const handleUndoCancel = async () => {
    if (!signatureId) return
    try {
      setLoadingReactivate(true)
      await undoCancelSignature(signatureId)
      await fetchAccount()
      await summaryQuery.refetch()
      toast.success('Cancelamento desfeito com sucesso.')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desfazer cancelamento.')
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
          <h2 className="text-xl font-semibold text-foreground">Assinatura e Plano</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados da assinatura...
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
          <h2 className="text-xl font-semibold text-foreground">Assinatura e Plano</h2>
        </div>
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-900">
              Nao foi possivel carregar os dados da assinatura.
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : 'Tente novamente em instantes.'}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => summaryQuery.refetch()}>
              Tentar novamente
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
          <h2 className="text-xl font-semibold text-foreground">Assinatura e Plano</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Voce ainda nao possui assinatura ativa. Quando contratar um plano, os detalhes aparecerao aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Assinatura e Plano</h2>
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
                  Cancelara no fim do periodo
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Valor: {toBrMoney(db.value)} {summary.source ? `· Fonte: ${summary.source}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Proxima cobranca: {toBrDate(nextDueDate)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cancelamento no fim do periodo: {cancelAtPeriodEnd ? 'Sim' : 'Nao'}
            </p>
            {endedAt && isCancelled && (
              <p className="text-xs text-muted-foreground mt-1">
                Encerrada em: {toBrDate(endedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1F2A37]">Cartao atual</p>
              {paymentMethod ? (
                <div className="mt-1 text-sm text-slate-700">
                  <p>
                    {formatBrand(paymentMethod.brand)} ****{paymentMethod.last4 || '----'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Validade: {formatExpiry(paymentMethod.expMonth, paymentMethod.expYear)}
                    {paymentMethod.funding ? ` · ${paymentMethod.funding}` : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  Nenhum cartao vinculado a assinatura no momento.
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Button
                variant="outline"
                onClick={() => {
                  if (!stripePromise) {
                    toast.error('Stripe nao configurado no frontend (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).')
                    return
                  }
                  setIsChangeCardOpen(true)
                }}
              >
                Trocar cartao
              </Button>
              <p className="text-xs text-slate-500">
                Atualiza apenas as proximas faturas.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {scheduledToCancel && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Sua assinatura esta programada para cancelar no fim do periodo.
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
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      Desfazer cancelamento
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {isActive && !isCancelled && !scheduledToCancel && (
            <>
              {!confirmingCancel ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => setConfirmingCancel(true)}
                  disabled={loadingCancel}
                >
                  Cancelar assinatura
                </Button>
              ) : (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-3">
                  <p className="text-xs text-slate-700">
                    Ao confirmar, sua assinatura sera cancelada no fim do periodo atual.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={loadingCancel}
                    >
                      Manter assinatura
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancelSubscription}
                      disabled={loadingCancel}
                    >
                      {loadingCancel ? 'Cancelando...' : 'Confirmar cancelamento'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {isCancelled && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Sua assinatura esta cancelada. Voce pode reativar selecionando um novo plano.
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
                      Redirecionando...
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      Reativar assinatura
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
          await summaryQuery.refetch()
          await fetchAccount()
        }}
        subscriptionId={subscriptionId}
      />
    </div>
  )
}

export default SubscriptionCard
