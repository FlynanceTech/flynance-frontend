import api from '@/lib/axios'
import axios from 'axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export type BillingSubscriptionPlan = {
  id: string
  name: string | null
}

export type BillingSubscriptionDb = {
  signatureId: string
  subscriptionId: string | null
  status: string
  active: boolean
  cancelAtPeriodEnd: boolean
  startDate: string | null
  endDate: string | null
  nextDueDate: string | null
  value: number | null
  plan: BillingSubscriptionPlan | null
}

export type BillingSubscriptionStripe = {
  id: string
  status: string
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  pauseCollection: unknown
}

export type BillingSubscriptionPaymentMethod = {
  id: string
  type: string
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
  funding: string | null
}

export type BillingSubscriptionSummary = {
  ok: boolean
  hasSubscription: boolean
  source: 'stripe' | 'db_only' | string
  db: BillingSubscriptionDb | null
  stripe: BillingSubscriptionStripe | null
  paymentMethod: BillingSubscriptionPaymentMethod | null
}

export type BillingSetupIntentResponse = {
  customerId: string
  clientSecret: string
}

export type UpdateBillingPaymentMethodPayload = {
  paymentMethodId: string
  subscriptionId?: string
}

export type UpdateBillingPaymentMethodResponse = {
  ok: true
  userId: string
  customerId: string
  subscriptionId: string | null
  updatedForFutureInvoices: true
  paymentMethod: {
    id: string
    type: string
    card: {
      brand: string | null
      last4: string | null
      expMonth: number | null
      expYear: number | null
      funding: string | null
    } | null
  }
}

type ApiErrorShape = {
  message?: string
  error?: string
}

function toBillingErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = (error.response?.data ?? {}) as ApiErrorShape
    const apiMessage =
      (typeof data.message === 'string' && data.message.trim()) ||
      (typeof data.error === 'string' && data.error.trim())

    if (apiMessage) return apiMessage
    if (status === 401) return 'Sua sessao expirou. Faca login novamente.'
    if (status === 403) return 'Voce nao tem permissao para acessar este recurso.'
    if (status === 400) return 'Requisicao invalida. Revise os dados informados.'
    if (status && status >= 500) return 'Servidor indisponivel no momento. Tente novamente.'
  }

  return getErrorMessage(error, fallback)
}

function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toISOString()
  }

  return null
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toSummaryRaw(raw: any): any {
  if (raw?.summary) return raw.summary
  if (raw?.data?.summary) return raw.data.summary
  if (raw?.data) return raw.data
  return raw ?? {}
}

function toDb(raw: any): BillingSubscriptionDb | null {
  if (!raw) return null
  const signatureId = String(raw?.signatureId ?? raw?.id ?? '')
  if (!signatureId) return null

  return {
    signatureId,
    subscriptionId:
      raw?.subscriptionId == null ? null : String(raw?.subscriptionId ?? null),
    status: String(raw?.status ?? 'unknown'),
    active: Boolean(raw?.active),
    cancelAtPeriodEnd: Boolean(raw?.cancelAtPeriodEnd),
    startDate: toIsoDate(raw?.startDate),
    endDate: toIsoDate(raw?.endDate),
    nextDueDate: toIsoDate(raw?.nextDueDate),
    value: toNumberOrNull(raw?.value),
    plan: raw?.plan
      ? {
          id: String(raw.plan.id ?? ''),
          name: raw.plan.name == null ? null : String(raw.plan.name),
        }
      : null,
  }
}

function toStripe(raw: any): BillingSubscriptionStripe | null {
  if (!raw) return null
  const id = String(raw?.id ?? '')
  if (!id) return null

  return {
    id,
    status: String(raw?.status ?? 'unknown'),
    cancelAtPeriodEnd: Boolean(raw?.cancelAtPeriodEnd),
    canceledAt: toIsoDate(raw?.canceledAt),
    currentPeriodStart: toIsoDate(raw?.currentPeriodStart),
    currentPeriodEnd: toIsoDate(raw?.currentPeriodEnd),
    pauseCollection: raw?.pauseCollection ?? null,
  }
}

function toPaymentMethod(raw: any): BillingSubscriptionPaymentMethod | null {
  if (!raw) return null
  const id = String(raw?.id ?? '')
  if (!id) return null

  return {
    id,
    type: String(raw?.type ?? 'card'),
    brand: raw?.brand == null ? null : String(raw.brand),
    last4: raw?.last4 == null ? null : String(raw.last4),
    expMonth: toNumberOrNull(raw?.expMonth),
    expYear: toNumberOrNull(raw?.expYear),
    funding: raw?.funding == null ? null : String(raw.funding),
  }
}

export async function getBillingSubscriptionSummary(): Promise<BillingSubscriptionSummary> {
  try {
    const response = await api.get('/billing/subscription/summary')
    const data = toSummaryRaw(response.data)
    return {
      ok: Boolean(data?.ok ?? true),
      hasSubscription: Boolean(data?.hasSubscription),
      source: String(data?.source ?? 'db_only'),
      db: toDb(data?.db),
      stripe: toStripe(data?.stripe),
      paymentMethod: toPaymentMethod(data?.paymentMethod),
    }
  } catch (error: unknown) {
    throw new Error(toBillingErrorMessage(error, 'Erro ao buscar resumo da assinatura.'))
  }
}

export async function createBillingSetupIntentMe(): Promise<BillingSetupIntentResponse> {
  try {
    const response = await api.post('/billing/setup-intent/me')
    const data = response.data ?? {}
    const clientSecret = String(data?.clientSecret ?? data?.client_secret ?? '')
    const customerId = String(data?.customerId ?? data?.customer_id ?? '')

    if (!clientSecret) {
      throw new Error('Nao foi possivel iniciar a troca de cartao.')
    }

    return { clientSecret, customerId }
  } catch (error: unknown) {
    throw new Error(toBillingErrorMessage(error, 'Erro ao iniciar troca de cartao.'))
  }
}

export async function updateBillingSubscriptionPaymentMethod(
  payload: UpdateBillingPaymentMethodPayload
): Promise<UpdateBillingPaymentMethodResponse> {
  try {
    const response = await api.post('/billing/subscription/payment-method', payload)
    const data = response.data ?? {}
    return {
      ok: true,
      userId: String(data?.userId ?? ''),
      customerId: String(data?.customerId ?? ''),
      subscriptionId:
        data?.subscriptionId == null ? null : String(data?.subscriptionId ?? null),
      updatedForFutureInvoices: true,
      paymentMethod: {
        id: String(data?.paymentMethod?.id ?? ''),
        type: String(data?.paymentMethod?.type ?? 'card'),
        card: data?.paymentMethod?.card
          ? {
              brand:
                data.paymentMethod.card.brand == null
                  ? null
                  : String(data.paymentMethod.card.brand),
              last4:
                data.paymentMethod.card.last4 == null
                  ? null
                  : String(data.paymentMethod.card.last4),
              expMonth: toNumberOrNull(data.paymentMethod.card.expMonth),
              expYear: toNumberOrNull(data.paymentMethod.card.expYear),
              funding:
                data.paymentMethod.card.funding == null
                  ? null
                  : String(data.paymentMethod.card.funding),
            }
          : null,
      },
    }
  } catch (error: unknown) {
    throw new Error(toBillingErrorMessage(error, 'Erro ao atualizar metodo de pagamento.'))
  }
}
