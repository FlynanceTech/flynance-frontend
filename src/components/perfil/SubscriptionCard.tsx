"use client"

import { useState } from "react"
import { CreditCard, AlertCircle, RotateCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUserSession } from "@/stores/useUserSession"
import { cancelSignature } from "@/services/payment"
import { useRouter } from "next/navigation"

type Cycle = "MONTHLY" | "YEARLY" | string
type BillingType = "CREDIT_CARD" | "PIX" | "BOLETO" | string
type SignatureStatus = 
  "ACTIVE" |
  "TRIALING" |
  "PAST_DUE" |
  "SUSPENDED" |
  "CANCELED" |
  "INCOMPLETE" |
  "EXPIRED" |
  "INACTIVE" | 
  string

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
  plan?: SignaturePlan
}

const SubscriptionCard = () => {
  const { user, fetchAccount  } = useUserSession()
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [loadingReactivate, setLoadingReactivate] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const router = useRouter()

  const signature = user?.userData?.signature as Signature | undefined

  if (!signature) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Assinatura e Plano
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Você ainda não possui uma assinatura ativa. Quando contratar um plano,
          os detalhes aparecerão aqui.
        </p>
      </div>
    )
  }

  const {
    plan,
    status,
    active,
    billingType,
    cycle,
    value,
    startDate,
    nextDueDate,
    endDate,
    updatedAt,
  } = signature

  const planName = plan?.name ?? "Plano Flynance"
  const price = value ?? (plan?.priceCents ? plan.priceCents / 100 : undefined)

  const isActive = !!active && status === "ACTIVE"
  const isCancelled = status === "CANCELED"

  const statusLabel = (() => {
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
  })()

  const cycleLabel = (() => {
    switch (cycle) {
      case "MONTHLY":
        return "Mensal"
      case "YEARLY":
        return "Anual"
      default:
        return cycle
    }
  })()

  const billingLabel = (() => {
    switch (billingType) {
      case "CREDIT_CARD":
        return "Cartão de crédito"
      case "PIX":
        return "Pix"
      case "BOLETO":
        return "Boleto"
      default:
        return billingType
    }
  })()

  // --------- Datas / trial ---------

  function computeNextDueDate(): Date | null {
    const today = new Date()

    if (nextDueDate) {
      const d = new Date(nextDueDate)
      return isNaN(d.getTime()) ? null : d
    }

    // fallback apenas pra mensal se não vier do backend
    if (cycle === "MONTHLY" && startDate) {
      let next = new Date(startDate)
      if (isNaN(next.getTime())) return null

      while (next <= today) {
        next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate())
      }
      return next
    }

    return null
  }

  const today = new Date()
  
  const hasUsedTrial = !!user?.userData?.user.hasUsedTrial
  const nextDue = computeNextDueDate()

  const trialEndDate = (() => {
    if (!plan?.trialDays || plan.trialDays <= 0 || !startDate) return null
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return null
    const end = new Date(start)
    end.setDate(end.getDate() + plan.trialDays)
    return end
  })()

  const isInTrial = !!trialEndDate && trialEndDate >= today && hasUsedTrial
  const trialEndLabel = trialEndDate?.toLocaleDateString("pt-BR")

  const daysUntilRenewal = (() => {
    if (!nextDue) return null
    const diffMs = nextDue.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays < 0 ? 0 : diffDays
  })()

  const isNearRenewal =
    isActive &&
    !isInTrial &&
    daysUntilRenewal !== null &&
    daysUntilRenewal !== undefined &&
    daysUntilRenewal <= 15

  const renewalDateLabel = nextDue
    ? nextDue.toLocaleDateString("pt-BR")
    : null

  const endDateObj = endDate ? new Date(endDate) : null
  const endDateLabel = endDateObj
    ? endDateObj.toLocaleDateString("pt-BR")
    : null

  const cancelledAtObj = isCancelled ? new Date(updatedAt) : null
  const cancelledAtLabel = cancelledAtObj
    ? cancelledAtObj.toLocaleDateString("pt-BR")
    : null

  const canStillUse =
    isCancelled && endDateObj !== null && endDateObj >= today

  // --------- Ações ---------

  const handleCancelSubscription = async () => {
    if (!signature.id) return
    try {
      setLoadingCancel(true)
      await cancelSignature(signature.id)
      await fetchAccount()
    } catch (error) {
      console.error("error canceling subscription", error)
      alert("Erro ao cancelar a assinatura. Tente novamente mais tarde.")
    } finally {
      setLoadingCancel(false)
      setConfirmingCancel(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!signature.id) return
    try {
      setLoadingReactivate(true)
      if (signature?.plan?.slug) {
        router.push(`/reativacao?plano=${encodeURIComponent(signature.plan.slug)}`);
      } else {
        console.warn("Sem slug de plano para reativação", signature?.plan);
      }

     /*  await reactivateSignature(signature.id) */ // TODO: implementar no serviço/payment se ainda não existir
      /* alert("Assinatura reativada com sucesso.") */
      // ideal: disparar refetch do /auth/me aqui
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
        <h2 className="text-xl font-semibold text-foreground">
          Assinatura e Plano
        </h2>
      </div>

      <div className="space-y-4">
        {/* Cabeçalho plano + status */}
        <div className="flex items-start justify-between pb-4 border-b border-border/15">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-foreground">
                {planName}
              </h3>

              <Badge
                variant="outline"
                className={
                  isActive
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }
              >
                {statusLabel}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              {cycleLabel} · {billingLabel}
              {price !== undefined && (
                <> · R$ {price.toFixed(2).replace(".", ",")}</>
              )}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Início da assinatura:{" "}
              {new Date(startDate).toLocaleDateString("pt-BR")}
            </p>

            {/* Linha de cobrança: só mostra para assinatura ativa */}
            {isActive && nextDue && renewalDateLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                {isInTrial && !hasUsedTrial ? "Primeira cobrança em " : "Próxima cobrança em "}
                {renewalDateLabel}
              </p>
            )}

            {/* Mensagem abaixo do título dependendo do estado */}
            {isActive && isInTrial && trialEndLabel && !hasUsedTrial && (
              <p className="text-xs font-medium text-primary mt-1">
                Você está no período gratuito até {trialEndLabel}. Após essa
                data, será realizada a primeira cobrança automaticamente.
              </p>
            )}

            {isCancelled && cancelledAtLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                Assinatura cancelada em {cancelledAtLabel}.
                {canStillUse && endDateLabel && (
                  <>
                    {" "}
                    Você ainda terá acesso à Flynance até {endDateLabel}.
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Banner período gratuito (apenas ativa + trial) */}
        {isActive && isInTrial && nextDue && renewalDateLabel && !hasUsedTrial && (
          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/30 rounded-xl">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Período gratuito ativo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está aproveitando seu período de teste. A primeira cobrança
                será em {renewalDateLabel}.
              </p>
            </div>
          </div>
        )}

        {/* Banner renovação próxima (fora do trial) */}
        {
        
        isNearRenewal && daysUntilRenewal !== null && (
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Renovação próxima
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sua assinatura será renovada em {daysUntilRenewal}{" "}
                {daysUntilRenewal === 1 ? "dia" : "dias"}. Certifique-se de que
                seus dados de pagamento estão atualizados.
              </p>
            </div>
          </div>
        )}

        {/* Ações de assinatura */}
        <div className="space-y-2">
          {isActive && (
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
                    {isInTrial && trialEndLabel && !hasUsedTrial ? (
                      <>
                        Você ainda está no{" "}
                        <span className="font-semibold text-destructive">
                          período gratuito
                        </span>{" "}
                        até{" "}
                        <span className="font-semibold text-destructive">
                          {trialEndLabel}
                        </span>
                        . Ao cancelar agora, você pode perder o acesso antes
                        mesmo de aproveitar todo o teste.
                      </>
                    ) : (
                      <>
                        Ao confirmar o cancelamento, sua assinatura será
                        encerrada ao final do período já pago e você deixará de
                        ter acesso às ferramentas da Flynance.
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

          {isCancelled && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {canStillUse && endDateLabel ? (
                  <>
                    Sua assinatura está{" "}
                    <span className="font-semibold text-destructive">
                      cancelada
                    </span>
                    , mas você ainda terá acesso à Flynance até{" "}
                    <span className="font-semibold">{endDateLabel}</span>. Se
                    mudou de ideia, você pode reativar a assinatura abaixo e
                    continuar de onde parou.
                  </>
                ) : (
                  <>
                    Sua assinatura está{" "}
                    <span className="font-semibold text-destructive">
                      cancelada
                    </span>
                    . Para voltar a usar a Flynance, reative sua assinatura
                    abaixo e recupere o acompanhamento da sua vida financeira.
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
      </div>
    </div>
  )
}

export default SubscriptionCard
