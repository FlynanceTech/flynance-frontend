const ORIGIN_OPTIONS = ['ORGANIC', 'CAMPAIGN', 'INFLUENCER'] as const
export type Origin = (typeof ORIGIN_OPTIONS)[number]

const SIGNUP_ORIGIN_KEY = 'flynance:signupOrigin'
const SIGNUP_ORIGIN_REF_KEY = 'flynance:signupOriginRef'
const SIGNUP_ORIGIN_TS_KEY = 'flynance:signupOriginTs'

export const ORIGIN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function normalizeOrigin(value?: string | null): Origin {
  const upper = (value ?? '').toUpperCase()
  return ORIGIN_OPTIONS.includes(upper as Origin) ? (upper as Origin) : 'ORGANIC'
}

export function parseOriginFromUrl(pathname: string, searchParams: URLSearchParams) {
  const originParamRaw = searchParams.get('origin') ?? searchParams.get('origem')
  const refParam = searchParams.get('ref') ?? searchParams.get('originRef') ?? ''
  let origin = normalizeOrigin(originParamRaw)
  let originRef = refParam.trim()

  const cleanPath = (pathname ?? '').split('?')[0]
  const firstSegment = cleanPath.replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''
  const segmentLower = firstSegment.toLowerCase()
  const campaignRefSplit = firstSegment.split('&ref=')
  const hasInlineCampaignRef = campaignRefSplit[0]?.toLowerCase() === 'campanha'
  const inlineCampaignRef = campaignRefSplit[1] ?? ''
  const isCampaignPath = segmentLower === 'campanha' || hasInlineCampaignRef

  const reserved = new Set([
    '',
    'cadastro',
    'checkout',
    'login',
    'reativacao',
    'winbackpage',
    'dashboard',
    'planos',
    'api',
    'termos',
    'privacidade',
  ])

  const hasPathHint = Boolean(firstSegment) && !reserved.has(segmentLower)
  const hasUrlHint =
    Boolean(originParamRaw) ||
    Boolean(refParam) ||
    isCampaignPath ||
    hasPathHint

  if (!originParamRaw) {
    if (hasInlineCampaignRef && !originRef) {
      originRef = inlineCampaignRef
    }
    if (isCampaignPath) {
      origin = 'CAMPAIGN'
    } else if (hasPathHint) {
      origin = 'INFLUENCER'
      if (!originRef) originRef = firstSegment
    }
  }

  if (origin === 'ORGANIC') originRef = ''

  return { origin, originRef, hasUrlHint }
}

export function saveOriginAttribution(origin: Origin, originRef?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIGNUP_ORIGIN_KEY, origin)
  localStorage.setItem(SIGNUP_ORIGIN_REF_KEY, origin === 'ORGANIC' ? '' : originRef ?? '')
  localStorage.setItem(SIGNUP_ORIGIN_TS_KEY, String(Date.now()))
}

export function readOriginAttribution() {
  if (typeof window === 'undefined') {
    return { origin: 'ORGANIC' as Origin, originRef: '' }
  }
  const storedOrigin = normalizeOrigin(localStorage.getItem(SIGNUP_ORIGIN_KEY))
  const storedOriginRef = localStorage.getItem(SIGNUP_ORIGIN_REF_KEY) ?? ''
  const storedTsRaw = localStorage.getItem(SIGNUP_ORIGIN_TS_KEY)
  const storedTs = storedTsRaw ? Number(storedTsRaw) : 0
  const isExpired = storedTs ? Date.now() - storedTs > ORIGIN_TTL_MS : false

  if (isExpired) {
    return { origin: 'ORGANIC' as Origin, originRef: '' }
  }

  return { origin: storedOrigin, originRef: storedOriginRef }
}

