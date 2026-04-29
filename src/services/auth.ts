import api from '@/lib/axios'
import {
  captureBillingCheckoutSessionFromPayload,
  normalizeAuthEmail,
  persistAuthToken,
} from '@/lib/authSession'

type AuthIdentifierPayload = {
  email?: string
  whatsappPhone?: string
}

function normalizeAuthPayload<T extends AuthIdentifierPayload>(payload: T): T {
  const normalizedEmail = normalizeAuthEmail(payload.email)

  return {
    ...payload,
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    ...(payload.whatsappPhone
      ? { whatsappPhone: String(payload.whatsappPhone).trim() }
      : {}),
  }
}

export async function sendLoginCode(data: { email?: string; whatsappPhone?: string }) {
  const payload = normalizeAuthPayload(data)
  const res = await api.post('/auth/send-code', payload, { withCredentials: true })
  return res.data
}

function extractAuthToken(payload: unknown): string | null {
  const data = (payload ?? {}) as Record<string, any>
  const candidates = [
    data?.token,
    data?.accessToken,
    data?.access_token,
    data?.jwt,
    data?.user?.token,
    data?.user?.accessToken,
    data?.user?.access_token,
    data?.user?.jwt,
    data?.userData?.token,
    data?.userData?.accessToken,
    data?.userData?.user?.token,
    data?.data?.token,
    data?.data?.accessToken,
    data?.data?.access_token,
    data?.data?.user?.token,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return null
}

export async function verifyCode(data: {
  email?: string
  whatsappPhone?: string
  code: string
}) {
  const payload = normalizeAuthPayload({
    ...data,
    code: String(data.code ?? '').trim(),
  })
  const res = await api.post('/auth/verify-code', payload, { withCredentials: true })
  const token = extractAuthToken(res.data)
  const billingCheckoutToken = captureBillingCheckoutSessionFromPayload(res.data)

  if (!token) {
    throw new Error('Token nÃ£o recebido no login.')
  }

  persistAuthToken(token)
  return { ...res.data, token, billingCheckoutToken }
}

export { extractAuthToken, normalizeAuthPayload }
