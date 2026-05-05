import api from '@/lib/axios'

export const AUTH_TOKEN_STORAGE_KEY = 'token'
export const BILLING_CHECKOUT_SESSION_STORAGE_KEY = 'billingCheckoutSession'

export type BillingCheckoutIdentity = {
  userId?: string | null
  email?: string | null
  phone?: string | null
}

export type BillingCheckoutSession = {
  token: string
  userId: string | null
  email: string | null
  phone: string | null
}

export function normalizeAuthEmail(email?: string | null): string {
  return String(email ?? '').trim().toLowerCase()
}

export function normalizeAuthPhone(phone?: string | null): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits.slice(2)
  }
  return digits
}

export function persistAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  const value = String(token ?? '').trim()
  if (!value) return
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, value)
}

export function readPersistedAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = String(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '').trim()
  return token || null
}

export function clearPersistedAuthToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

function normalizeBillingCheckoutSession(
  session: Partial<BillingCheckoutSession> & { token?: string | null }
): BillingCheckoutSession | null {
  const token = String(session.token ?? '').trim()
  if (!token) return null

  const userId = String(session.userId ?? '').trim() || null
  const email = normalizeAuthEmail(session.email)
  const phone = normalizeAuthPhone(session.phone)

  return {
    token,
    userId,
    email: email || null,
    phone: phone || null,
  }
}

export function extractBillingCheckoutToken(payload: unknown): string | null {
  const data = (payload ?? {}) as Record<string, any>
  const candidates = [
    data?.billingCheckoutToken,
    data?.billing_checkout_token,
    data?.checkoutToken,
    data?.checkout_token,
    data?.user?.billingCheckoutToken,
    data?.user?.billing_checkout_token,
    data?.userData?.billingCheckoutToken,
    data?.data?.billingCheckoutToken,
    data?.data?.billing_checkout_token,
    data?.billing?.billingCheckoutToken,
    data?.billing?.checkoutToken,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

function extractUserIdentityFromPayload(payload: unknown): BillingCheckoutIdentity {
  const data = (payload ?? {}) as Record<string, any>
  const candidates = [
    data?.user,
    data?.userData?.user,
    data?.data?.user,
    data?.data?.userData?.user,
  ]

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return {
        userId: typeof candidate.id === 'string' ? candidate.id : null,
        email: typeof candidate.email === 'string' ? candidate.email : null,
        phone: typeof candidate.phone === 'string' ? candidate.phone : null,
      }
    }
  }

  return {
    userId: null,
    email: null,
    phone: null,
  }
}

function extractLeadIdentityFromPayload(payload: unknown): BillingCheckoutIdentity {
  const data = (payload ?? {}) as Record<string, any>
  const lead = data?.lead
  if (lead && typeof lead === 'object') {
    return {
      userId: null,
      email: typeof lead.email === 'string' ? lead.email : null,
      phone: typeof lead.phone === 'string' ? lead.phone : null,
    }
  }
  return { userId: null, email: null, phone: null }
}

export function persistBillingCheckoutSession(
  session: BillingCheckoutIdentity & { token: string }
): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeBillingCheckoutSession(session)
  if (!normalized) return

  window.sessionStorage.setItem(
    BILLING_CHECKOUT_SESSION_STORAGE_KEY,
    JSON.stringify(normalized)
  )
}

export function persistBillingCheckoutToken(
  token: string,
  identity?: BillingCheckoutIdentity
): void {
  persistBillingCheckoutSession({ token, ...identity })
}

export function readBillingCheckoutSession(): BillingCheckoutSession | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(BILLING_CHECKOUT_SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    return normalizeBillingCheckoutSession(
      JSON.parse(raw) as Partial<BillingCheckoutSession> & { token?: string | null }
    )
  } catch {
    return null
  }
}

function readBillingCheckoutTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(window.location.search)
  const token = String(
    params.get('billingCheckoutToken') ??
      params.get('checkoutToken') ??
      ''
  ).trim()

  if (!token) return null

  persistBillingCheckoutToken(token)
  return token
}

export function readBillingCheckoutToken(): string | null {
  return readBillingCheckoutSession()?.token ?? readBillingCheckoutTokenFromUrl()
}

export function syncBillingCheckoutSessionIdentity(identity: BillingCheckoutIdentity): void {
  const current = readBillingCheckoutSession()
  if (!current?.token) return

  persistBillingCheckoutSession({
    token: current.token,
    userId: identity.userId ?? current.userId,
    email: identity.email ?? current.email,
    phone: identity.phone ?? current.phone,
  })
}

export function doesBillingCheckoutSessionMatchIdentity(
  identity: BillingCheckoutIdentity
): boolean {
  const session = readBillingCheckoutSession()
  if (!session?.token) return false

  const userId = String(identity.userId ?? '').trim()
  const email = normalizeAuthEmail(identity.email)
  const phone = normalizeAuthPhone(identity.phone)

  const hasKnownIdentity = Boolean(session.userId || session.email || session.phone)
  if (!hasKnownIdentity) return false

  if (userId && session.userId && userId === session.userId) return true
  if (email && session.email && email === session.email) return true
  if (phone && session.phone && phone === session.phone) return true

  return false
}

export function clearBillingCheckoutSession(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(BILLING_CHECKOUT_SESSION_STORAGE_KEY)
}

export function captureBillingCheckoutSessionFromPayload(payload: unknown): string | null {
  const billingCheckoutToken = extractBillingCheckoutToken(payload)
  if (!billingCheckoutToken) return null

  let identity = extractUserIdentityFromPayload(payload)
  if (!identity.userId && !identity.email && !identity.phone) {
    identity = extractLeadIdentityFromPayload(payload)
  }

  persistBillingCheckoutSession({ token: billingCheckoutToken, ...identity })

  return billingCheckoutToken
}

export async function clearAuthSessionArtifacts(): Promise<void> {
  clearPersistedAuthToken()
  clearBillingCheckoutSession()

  try {
    await api.post('/auth/logout', {}, { withCredentials: true })
  } catch {
    // best effort: stale cookies should not block local invalidation
  }
}
