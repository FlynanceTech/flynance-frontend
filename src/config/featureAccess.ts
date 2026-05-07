import type { PlansResponse } from '@/types/plan'

import { FEATURES } from './features'

function normalizePlanText(plan: PlansResponse): string {
  return [
    plan.slug,
    plan.name,
    plan.description,
    ...(Array.isArray(plan.features)
      ? plan.features.flatMap((feature) => [feature.label, feature.key, feature.value])
      : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function isCouplePlan(plan: PlansResponse): boolean {
  const text = normalizePlanText(plan)

  return [
    /\bcasal\b/,
    /\bcouple\b/,
    /\bduo\b/,
    /\bpartner\b/,
    /\bfamily\b/,
    /\bfamilia\b/,
    /\bshared\b/,
    /\bcompartilh/,
    /\bhouse\b/,
    /\b2\s*(usuarios|pessoas|people|members)\b/,
    /\bdois\s*(usuarios|membros)\b/,
  ].some((pattern) => pattern.test(text))
}

export function isPlanCheckoutDisabled(plan: PlansResponse): boolean {
  return !FEATURES.COUPLE_ACCOUNT && isCouplePlan(plan)
}
