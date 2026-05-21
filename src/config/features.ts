const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV

export const FEATURE_COUPLE_ACCOUNT = APP_ENV !== 'production'
export const FEATURE_EDUCATION = false
export const FEATURE_FUTURES = APP_ENV !== 'production'
export const FEATURE_REPORTS_V1 = false

export const FEATURES = {
  COUPLE_ACCOUNT: FEATURE_COUPLE_ACCOUNT,
  EDUCATION: FEATURE_EDUCATION,
  FUTURES: FEATURE_FUTURES,
  REPORTS_V1: FEATURE_REPORTS_V1,
} as const

export type FeatureFlag = keyof typeof FEATURES
