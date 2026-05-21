const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV
const isDevHost = typeof window !== 'undefined' && window.location.hostname.startsWith('dev.')
const isNonProduction = APP_ENV !== 'production' || isDevHost

export const FEATURE_COUPLE_ACCOUNT = isNonProduction
export const FEATURE_EDUCATION = false
export const FEATURE_FUTURES = isNonProduction
export const FEATURE_REPORTS_V1 = false

export const FEATURES = {
  COUPLE_ACCOUNT: FEATURE_COUPLE_ACCOUNT,
  EDUCATION: FEATURE_EDUCATION,
  FUTURES: FEATURE_FUTURES,
  REPORTS_V1: FEATURE_REPORTS_V1,
} as const

export type FeatureFlag = keyof typeof FEATURES
