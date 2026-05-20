export const FEATURE_COUPLE_ACCOUNT = process.env.NODE_ENV !== 'production'
export const FEATURE_EDUCATION = false
export const FEATURE_FUTURES = process.env.NODE_ENV !== 'production'
export const FEATURE_REPORTS_V1 = false

export const FEATURES = {
  COUPLE_ACCOUNT: FEATURE_COUPLE_ACCOUNT,
  EDUCATION: FEATURE_EDUCATION,
  FUTURES: FEATURE_FUTURES,
  REPORTS_V1: FEATURE_REPORTS_V1,
} as const

export type FeatureFlag = keyof typeof FEATURES
