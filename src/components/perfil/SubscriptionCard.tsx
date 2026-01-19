"use client"

import { useMemo, useState } from "react"
import { CreditCard, AlertCircle, RotateCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUserSession } from "@/stores/useUserSession"
import { cancelSignature, undoCancelSignature } from "@/services/payment"
import { useRouter } from "next/navigation"
import { useSignature } from "@/hooks/query/useSignature"

// ==============================
// Tipos (DB + Stripe)
// ==============================
type Cycle = "MONTHLY" | "YEARLY" | string
type BillingType = "CREDIT_CARD" | "PIX" | "BOLETO" | string
type SignatureStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELED"
  | "INCOMPLETE"
  | "EXPIRED"
  | "INACTIVE"
  | string

type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | string

interface SignaturePlan {
  id: string
  name: string
  slug: string
  description: string | null
  priceCents: number
  currency: string
  period: Cycle
  trialDays: number
}

interface Signature {
  id: string
  startDate: string
  endDate: string | null
  nextDueDate: string | null
  active: boolean
  status: SignatureStatus
  billingType: BillingType
  cycle: Cycle
  value: number
  updatedAt: string
  cancelAtPeriodEnd?: boolean | null
  plan?: SignaturePlan
}

type StripeSubscription = {
  id: string
  status: StripeSubscriptionStatus
  cancel_at_period_end?: boolean
  cancel_at?: number | null
  canceled_at?: number | null
  current_period_start?: number | null
  current_period_end?: number | null
  trial_start?: number | null
  trial_end?: number | null
  default_payment_method?: string | null
  latest_invoice?: any
  items?: { data?: any[] }
}

type LastSubscriptionResponse = {
  signature: Signature
  stripeSubscription?: StripeSubscription | null
  stripe?: { ok: boolean }
}

// ==============================
// Helpers
// ==============================
function safeDateFromIsoOrNull(v?: string | null): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function safeDateFromUnixOrNull(v?: number | null): Date | null {
  if (v == null) return null
  const d = new Date(v * 1000)
  return isNaN(d.getTime()) ? null : d
}

function brDate(d: Date | null) {
  return d ? d.toLocaleDateString("pt-BR") : null
}

function brMoney(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return null
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`
}

function mapStripeStatusToLabel(status: StripeSubscriptionStatus) {
  switch (status) {
    case "active":
      return "Ativo"
    case "trialing":
      return "Em teste"
    case "past_due":
      return "Vencida"
    case "canceled":
      return "Cancelada"
    case "incomplete":
      return "Incompleta"
    case "incomplete_expired":
      return "Incompleta (expirada)"
    case "unpaid":
      return "Não paga"
    case "paused":
      return "Pausada"
    default:
      return status
  }
}

function mapDbStatusToLabel(status: SignatureStatus) {
  switch (status) {
    case "ACTIVE":
      return "Ativo"
    case "CANCELED":
      return "Cancelado"
    case "TRIALING":
      return "Em teste"
    case "SUSPENDED":
      return "Suspensa"
    case "PAST_DUE":
      return "Vencida"
    case "INCOMPLETE":
      return "Incompleta"
    case "EXPIRED":
      return "Expirada"
    case "INACTIVE":
      return "Inativa"
    default:
      return status
  }
}

function mapCycleToLabel(cycle: Cycle) {
  switch (cycle) {
    case "MONTHLY":
      return "Mensal"
    case "YEARLY":
      return "Anual"
    default:
      return cycle
  }
}

function mapBillingToLabel(b: BillingType) {
  switch (b) {
    case "CREDIT_CARD":
      return "Cartão de crédito"
    case "PIX":
      return "Pix"
    case "BOLETO":
      return "Boleto"
    default:
      return b
  }
}

const SubscriptionCard = () => {
  const { user, fetchAccount } = useUserSession()
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [loadingReactivate, setLoadingReactivate] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const router = useRouter()

  const userId = user?.userData?.user?.id

  // ✅ query só dispara quando userId existir (enabled já está no hook)
  const { useSignatureByUserId } = useSignature(userId)
  const { data, isLoading, isError, isFetching, refetch } = useSignatureByUserId

  // Normaliza payload vindo do backend: { lastSubscription: { signature, stripeSubscription, ... } }
  const last: LastSubscriptionResponse | null = useMemo(() => {
    if (!data) return null
    const raw = (data as any).lastSubscription
    if (!raw?.signature) return null
    return {
      signature: raw.signature,
      stripeSubscription: raw.stripeSubscription ?? null,
      stripe: raw.stripe,
    }
  }, [data])

  // ==============================
  // Loading / Error states
  // ==============================
  if (isLoading || isFetching) {
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
          Carregando informações da assinatura...
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Assinatura e Plano</h2>
        </div>
        <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Não foi possível carregar sua assinatura
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tente novamente. Se o problema persistir, contate o suporte.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const signature = last?.signature
  const stripeSubscription = last?.stripeSubscription ?? null

  if (!signature) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Assinatura e Plano</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Você ainda não possui uma assinatura ativa. Quando contratar um plano, os detalhes aparecerão aqui.
        </p>
      </div>
    )
  }

  // ==============================
  // Prioridade Stripe > DB
  // ==============================
  const planName = signature.plan?.name ?? "Plano Flynance"
  const cycleLabel = mapCycleToLabel(signature.cycle)
  const billingLabel = mapBillingToLabel(signature.billingType)

  const price =
    signature.value ??
    (signature.plan?.priceCents ? signature.plan.priceCents / 100 : null)

  const stripeStatus = stripeSubscription?.status

  // Status label: prefere Stripe quando houver
  const effectiveStatusLabel = stripeStatus
    ? mapStripeStatusToLabel(stripeStatus)
    : mapDbStatusToLabel(signature.status)

  // Ativo: Stripe (active/trialing) ou DB
  const isActive = stripeStatus
    ? stripeStatus === "active" || stripeStatus === "trialing"
    : !!signature.active && signature.status === "ACTIVE"

  // Cancelado “de verdade”: Stripe status === canceled OU DB status === CANCELED
  const isCancelled = stripeStatus
    ? stripeStatus === "canceled"
    : signature.status === "CANCELED"

  // Cancelamento agendado: active/trialing e cancel_at_period_end === true
  const isScheduledToCancel =
    (stripeStatus === "active" || stripeStatus === "trialing") &&
    (stripeSubscription?.cancel_at_period_end ?? false)

  // Datas
  const startDate = safeDateFromIsoOrNull(signature.startDate)

  // Próxima cobrança: preferir Stripe current_period_end; fallback para cancel_at; depois DB
  const nextDue = (() => {
    const byStripe = safeDateFromUnixOrNull(stripeSubscription?.current_period_end ?? null)
    if (byStripe) return byStripe

    const byStripeCancelAt = safeDateFromUnixOrNull(stripeSubscription?.cancel_at ?? null)
    if (byStripeCancelAt) return byStripeCancelAt

    const byDb = safeDateFromIsoOrNull(signature.nextDueDate)
    if (byDb) return byDb

    return null
  })()

  // Trial end: preferir Stripe trial_end
  const trialEnd = (() => {
    const byStripe = safeDateFromUnixOrNull(stripeSubscription?.trial_end ?? null)
    if (byStripe) return byStripe

    if (!signature.plan?.trialDays || signature.plan.trialDays <= 0) return null
    if (!startDate) return null
    const end = new Date(startDate)
    end.setDate(end.getDate() + signature.plan.trialDays)
    return end
  })()

  const today = new Date()

  // Em trial: Stripe trialing + trialEnd no futuro
  const isInTrial =
    stripeStatus === "trialing" && !!trialEnd && trialEnd.getTime() >= today.getTime()

  const renewalDateLabel = brDate(nextDue)
  const trialEndLabel = brDate(trialEnd)

  const daysUntilRenewal = (() => {
    if (!nextDue) return null
    const diffMs = nextDue.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays < 0 ? 0 : diffDays
  })()

  const isNearRenewal =
    isActive && !isInTrial && daysUntilRenewal != null && daysUntilRenewal <= 15

  // Cancelado em:
  const cancelledAt = (() => {
    const byStripe = safeDateFromUnixOrNull(stripeSubscription?.canceled_at ?? null)
    if (byStripe) return byStripe
    return safeDateFromIsoOrNull(signature.updatedAt)
  })()

  const cancelledAtLabel = brDate(cancelledAt)

  // Ainda pode usar até:
  const endDateObj = safeDateFromIsoOrNull(signature.endDate)
  const endDateLabel = brDate(endDateObj)
  const canStillUse = isCancelled && endDateObj !== null && endDateObj >= today

  // ==============================
  // Ações
  // ==============================
  const handleCancelSubscription = async () => {
    if (!signature.id) return
    try {
      setLoadingCancel(true)
      await cancelSignature(signature.id)
      await fetchAccount()
      await refetch()
    } catch (error) {
      console.error("error canceling subscription", error)
      alert("Erro ao cancelar a assinatura. Tente novamente mais tarde.")
    } finally {
      setLoadingCancel(false)
      setConfirmingCancel(false)
    }
  }

  // ✅ Desfazer cancelamento agendado (Stripe cancel_at_period_end=false)
  const handleUndoCancel = async () => {
    if (!signature.id) return
    try {
      setLoadingReactivate(true)
      await undoCancelSignature(signature.id)
      await fetchAccount()
      await refetch()
    } catch (error) {
      console.error("error undo cancel", error)
      alert("Erro ao desfazer cancelamento. Tente novamente mais tarde.")
    } finally {
      setLoadingReactivate(false)
    }
  }

  // ✅ Reativar (quando realmente cancelada)
  const handleReactivateSubscription = async () => {
    try {
      setLoadingReactivate(true)
      if (signature?.plan?.slug) {
        router.push(`/reativacao?plano=${encodeURIComponent(signature.plan.slug)}`)
      } else {
        router.push(`/WinbackPage/planos`)
      }
    } catch (error) {
      console.error("error reactivating subscription", error)
      alert("Erro ao reativar a assinatura. Tente novamente mais tarde.")
    } finally {
      setLoadingReactivate(false)
    }
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
        {/* Cabeçalho plano + status */}
        <div className="flex items-start justify-between pb-4 border-b border-border/15">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-foreground">{planName}</h3>

              <Badge
                variant="outline"
                className={
                  isActive
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }
                title={
                  stripeStatus
                    ? `Stripe: ${stripeStatus}`
                    : `DB: ${signature.status}`
                }
              >
                {effectiveStatusLabel}
              </Badge>

              {/* Tag quando cancelamento agendado */}
              {isScheduledToCancel && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Cancelará no fim do período
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {cycleLabel} · {billingLabel}
              {price != null && <> · {brMoney(price)}</>}
            </p>

            {startDate &&  (
              <p className="text-xs text-muted-foreground mt-1">
                Início da assinatura: {brDate(startDate)}
              </p>
            )}

            {/* Próxima cobrança */}
            {isActive && renewalDateLabel && !isScheduledToCancel && (
              <p className="text-xs text-muted-foreground mt-1">
                {isInTrial ? "Primeira cobrança em " : "Próxima cobrança em "}
                {renewalDateLabel}
              </p>
            )}

            {/* Mensagem de trial */}
            {isActive && isInTrial && trialEndLabel && !isScheduledToCancel &&(
              <p className="text-xs font-medium text-primary mt-1">
                Você está no período gratuito até {trialEndLabel}. Após essa data, será realizada a primeira cobrança automaticamente.
              </p>
            )}

            {/* Cancelada */}
            {isCancelled && (
              <p className="text-xs text-muted-foreground mt-1">
                Assinatura cancelada {cancelledAtLabel ? `em ${cancelledAtLabel}.` : "."}
                {canStillUse && endDateLabel && <> Você ainda terá acesso à Flynance até {endDateLabel}.</>}
              </p>
            )}
          </div>
        </div>

        {/* Banner trial */}
        {isActive && isInTrial && renewalDateLabel && !isScheduledToCancel && (
          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/30 rounded-xl">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Período gratuito ativo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está aproveitando seu período de teste. A primeira cobrança será em {renewalDateLabel}.
              </p>
            </div>
          </div>
        )}

        {/* Banner renovação próxima */}
        {isNearRenewal && daysUntilRenewal != null && (
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Renovação próxima</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sua assinatura será renovada em {daysUntilRenewal}{" "}
                {daysUntilRenewal === 1 ? "dia" : "dias"}. Certifique-se de que seus dados de pagamento estão atualizados.
              </p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="space-y-2">
          {/* ✅ Caso: assinatura ativa (ou trialing) com cancelamento agendado => mostrar "Desfazer cancelamento" */}
          {isScheduledToCancel && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Sua assinatura está{" "}
                <span className="font-semibold text-warning">programada para cancelar</span>{" "}
                no fim do período. Se mudou de ideia, você pode desfazer o cancelamento agora.
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

          {/* ✅ Caso: assinatura ativa (sem cancelamento agendado) => botão cancelar */}
          {isActive && !isCancelled && !isScheduledToCancel && (
            <>
              {!confirmingCancel ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => setConfirmingCancel(true)}
                  disabled={loadingCancel}
                >
                  Cancelar Assinatura
                </Button>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {isInTrial && trialEndLabel ? (
                      <>
                        Você ainda está no{" "}
                        <span className="font-semibold text-destructive">período gratuito</span>{" "}
                        até{" "}
                        <span className="font-semibold text-destructive">{trialEndLabel}</span>. Ao cancelar agora, você pode perder o acesso antes mesmo de aproveitar todo o teste.
                      </>
                    ) : (
                      <>
                        Ao confirmar o cancelamento, sua assinatura ficará programada para{" "}
                        <span className="font-semibold text-destructive">cancelar no fim do período</span>{" "}
                        atual (você mantém acesso até lá).
                      </>
                    )}
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
                      {loadingCancel ? "Cancelando..." : "Confirmar cancelamento"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ✅ Caso: assinatura realmente cancelada => mostrar "Reativar assinatura" */}
          {isCancelled && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {canStillUse && endDateLabel ? (
                  <>
                    Sua assinatura está{" "}
                    <span className="font-semibold text-destructive">cancelada</span>, mas você ainda terá acesso à Flynance até{" "}
                    <span className="font-semibold">{endDateLabel}</span>. Se mudou de ideia, você pode reativar abaixo e continuar de onde parou.
                  </>
                ) : (
                  <>
                    Sua assinatura está{" "}
                    <span className="font-semibold text-destructive">cancelada</span>. Para voltar a usar a Flynance, reative sua assinatura abaixo.
                  </>
                )}
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
                      Reativando...
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

        {/* Debug opcional */}
        {/* <pre className="text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-xl overflow-auto">
          {JSON.stringify({ signature, stripeSubscription }, null, 2)}
        </pre> */}
      </div>
    </div>
  )
}

export default SubscriptionCard
