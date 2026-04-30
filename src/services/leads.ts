import axios from 'axios'
import {
  persistBillingCheckoutToken,
  readBillingCheckoutToken,
  clearBillingCheckoutSession,
} from '@/lib/authSession'
import { BillingCheckoutTokenError } from '@/services/billingCheckout'

const leadsApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api',
  withCredentials: false,
})

export type CaptureLeadInput = {
  name: string
  email: string
  phone: string
  origin?: 'ORGANIC' | 'CAMPAIGN' | 'INFLUENCER'
  originRef?: string
}

export type LeadDTO = {
  id: string
  name: string
  email: string
  phone: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export type CaptureLeadResponse = {
  lead: LeadDTO
  billingCheckoutToken: string
}

export type LeadBillingInput = {
  cpfCnpj?: string
  postalCode?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  district?: string
  city?: string
  state?: string
}

export async function captureLead(input: CaptureLeadInput): Promise<CaptureLeadResponse> {
  const response = await leadsApi.post('/lead', input)
  const data = response.data ?? {}

  const token: string =
    data?.billingCheckoutToken ?? data?.checkoutToken ?? ''

  if (token) {
    persistBillingCheckoutToken(token, {
      email: data?.lead?.email ?? null,
      phone: data?.lead?.phone ?? null,
    })
  }

  return {
    lead: data.lead,
    billingCheckoutToken: token,
  }
}

export function isExistingAccountCheckoutError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false

  const status = error.response?.status
  const data = error.response?.data ?? {}
  const code = String(data?.code ?? '').toUpperCase()
  const message = String(data?.message ?? data?.error ?? error.message ?? '').toLowerCase()

  return (
    status === 409 &&
    (code === 'CHECKOUT_ACCOUNT_EXISTS' ||
      message.includes('faça login') ||
      message.includes('faca login') ||
      message.includes('já possui uma conta') ||
      message.includes('ja possui uma conta'))
  )
}

export async function updateLeadBilling(input: LeadBillingInput): Promise<void> {
  const token = readBillingCheckoutToken()
  if (!token) throw new BillingCheckoutTokenError()

  try {
    await leadsApi.patch('/users/me/billing', input, {
      headers: { 'x-billing-checkout-token': token },
    })
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      const message = String(
        err.response?.data?.message ?? err.response?.data?.error ?? err.message ?? ''
      ).toLowerCase()

      if (
        (status === 401 || status === 403) &&
        (message.includes('token') || message.includes('expirado') || message.includes('expired'))
      ) {
        clearBillingCheckoutSession()
        throw new BillingCheckoutTokenError()
      }
    }
    throw err
  }
}
