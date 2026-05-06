import axios from 'axios'
import {
  clearBillingCheckoutSession,
  readPersistedAuthToken,
  readBillingCheckoutToken,
} from '@/lib/authSession'

const billingCheckoutApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api',
  withCredentials: false,
})

export type BillingCheckoutSubscriptionPayload = {
  userId?: string
  planId: string
  paymentMethodId: string
  promoCode?: string
  annualBilling?: 'UPFRONT' | 'INSTALLMENTS'
}

export class BillingCheckoutTokenError extends Error {
  constructor(message = 'Sessao de checkout expirada. Refaca a validacao para continuar.') {
    super(message)
    this.name = 'BillingCheckoutTokenError'
  }
}

function requireBillingCheckoutToken(): string {
  const billingCheckoutToken = readBillingCheckoutToken()
  if (!billingCheckoutToken) {
    throw new BillingCheckoutTokenError()
  }

  return billingCheckoutToken
}

function authFromAppToken(appToken: string) {
  return {
    headers: { Authorization: `Bearer ${appToken}` },
    billingCheckoutToken: null as string | null,
  }
}

function readBillingRequestAuth(preferAppToken = false) {
  const appToken = readPersistedAuthToken()
  if (preferAppToken && appToken) {
    return authFromAppToken(appToken)
  }

  const billingCheckoutToken = readBillingCheckoutToken()
  if (billingCheckoutToken) {
    return {
      headers: getBillingCheckoutHeaders(billingCheckoutToken),
      billingCheckoutToken,
    }
  }

  if (appToken) return authFromAppToken(appToken)

  throw new BillingCheckoutTokenError()
}

function isBillingCheckoutTokenApiError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false

  const status = error.response?.status
  const message = String(
    error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      ''
  ).toLowerCase()

  if ((status === 401 || status === 403) && message.includes('token')) {
    return true
  }

  return (
    message.includes('billing checkout token') ||
    message.includes('checkout token') ||
    message.includes('token expired') ||
    message.includes('token invalido') ||
    message.includes('token inválido') ||
    message.includes('invalid token') ||
    message.includes('expired token')
  )
}

function getBillingCheckoutHeaders(billingCheckoutToken: string) {
  return {
    'x-billing-checkout-token': billingCheckoutToken,
  }
}

export function isBillingCheckoutTokenError(error: unknown): boolean {
  return error instanceof BillingCheckoutTokenError || isBillingCheckoutTokenApiError(error)
}

export function clearBillingCheckoutOnInvalidToken(error: unknown): boolean {
  if (!isBillingCheckoutTokenError(error)) return false
  clearBillingCheckoutSession()
  return true
}

export async function createBillingCheckoutSetupIntent(userId?: string): Promise<{
  clientSecret: string
  customerId?: string | null
}> {
  const auth = readBillingRequestAuth(Boolean(userId))
  const body: Record<string, unknown> = {}
  if (auth.billingCheckoutToken) body.billingCheckoutToken = auth.billingCheckoutToken
  if (userId) body.userId = userId

  const response = await billingCheckoutApi.post(
    '/billing/setup-intent',
    body,
    {
      headers: auth.headers,
    }
  )

  const data = response.data ?? {}
  const clientSecret =
    data.clientSecret ??
    data.client_secret ??
    data?.setupIntent?.client_secret ??
    data?.setup_intent?.client_secret

  if (!clientSecret || typeof clientSecret !== 'string') {
    throw new Error('Nao foi possivel iniciar o pagamento.')
  }

  return {
    clientSecret,
    customerId: data.customerId ?? data.customer_id ?? null,
  }
}

export async function createBillingCheckoutSubscription(
  payload: BillingCheckoutSubscriptionPayload
): Promise<void> {
  const auth = readBillingRequestAuth(Boolean(payload.userId))

  await billingCheckoutApi.post(
    '/billing/subscription',
    {
      ...payload,
      ...(auth.billingCheckoutToken ? { billingCheckoutToken: auth.billingCheckoutToken } : {}),
    },
    {
      headers: auth.headers,
    }
  )
}

export type BillingCheckoutProfileInput = {
  name?: string
  phone?: string
  cpfCnpj?: string
}

/**
 * Atualiza perfil do usuário/lead via PUT /billing/checkout/profile.
 * Usa billingCheckoutToken (checkout público) ou JWT (usuário logado).
 * Nunca envia email — troca de email exige fluxo autenticado dedicado.
 */
export async function updateBillingCheckoutProfile(
  data: BillingCheckoutProfileInput,
  userId?: string
): Promise<void> {
  const auth = readBillingRequestAuth(Boolean(userId))

  const body: Record<string, unknown> = {}
  if (data.name !== undefined) body.name = data.name
  if (data.phone !== undefined) body.phone = data.phone
  if (data.cpfCnpj !== undefined) body.cpfCnpj = data.cpfCnpj
  if (auth.billingCheckoutToken) body.billingCheckoutToken = auth.billingCheckoutToken

  await billingCheckoutApi.put('/billing/checkout/profile', body, {
    headers: auth.headers,
  })
}

export { billingCheckoutApi }
