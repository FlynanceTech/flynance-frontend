// Consentimento de cookies (LGPD): scripts de analytics/marketing só carregam
// após opt-in explícito. A decisão fica num cookie first-party — o banner é
// exibido enquanto não houver decisão registrada para a versão atual.

export const CONSENT_COOKIE_NAME = 'fly-cookie-consent'
export const CONSENT_VERSION = 1
const CONSENT_MAX_AGE_DAYS = 180

export type ConsentCategories = {
  analytics: boolean
  marketing: boolean
}

export type CookieConsent = ConsentCategories & {
  /** versão do esquema de consentimento — re-pergunta quando muda */
  v: number
  /** ISO da decisão */
  ts: string
}

export const DENY_ALL: ConsentCategories = { analytics: false, marketing: false }
export const GRANT_ALL: ConsentCategories = { analytics: true, marketing: true }

/** Lê a decisão salva; retorna null se ausente ou de uma versão anterior. */
export function readConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`))
  if (!match) return null

  try {
    const raw = decodeURIComponent(match.slice(CONSENT_COOKIE_NAME.length + 1))
    const parsed = JSON.parse(raw) as Partial<CookieConsent>
    if (parsed?.v !== CONSENT_VERSION) return null
    return {
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      v: CONSENT_VERSION,
      ts: typeof parsed.ts === 'string' ? parsed.ts : '',
    }
  } catch {
    return null
  }
}

/** Persiste a decisão no cookie e retorna o registro completo. */
export function writeConsent(categories: ConsentCategories): CookieConsent {
  const consent: CookieConsent = {
    analytics: categories.analytics,
    marketing: categories.marketing,
    v: CONSENT_VERSION,
    ts: new Date().toISOString(),
  }

  if (typeof document !== 'undefined') {
    const value = encodeURIComponent(JSON.stringify(consent))
    const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`
  }

  return consent
}

export function hasDecision(): boolean {
  return readConsent() !== null
}
