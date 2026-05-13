export const FEATURE_COUPLE_ACCOUNT = true
export const FEATURE_EDUCATION = false
export const FEATURE_REPORTS_V1 = false

export const FEATURES = {
  COUPLE_ACCOUNT: FEATURE_COUPLE_ACCOUNT,
  EDUCATION: FEATURE_EDUCATION,
  REPORTS_V1: FEATURE_REPORTS_V1,
} as const

export type FeatureFlag = keyof typeof FEATURES
