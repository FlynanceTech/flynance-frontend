'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBillingSetupIntentMe,
  getBillingSubscriptionSummary,
  UpdateBillingPaymentMethodPayload,
  updateBillingSubscriptionPaymentMethod,
} from '@/services/billing'

export const billingKeys = {
  subscriptionSummaryRoot: ['billing', 'subscription', 'summary'] as const,
  subscriptionSummary: (userId?: string) =>
    [...billingKeys.subscriptionSummaryRoot, userId ?? 'anonymous'] as const,
}

export function useBillingSubscriptionSummary(enabled = true, userId?: string) {
  return useQuery({
    queryKey: billingKeys.subscriptionSummary(userId),
    queryFn: getBillingSubscriptionSummary,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

export function useCreateBillingSetupIntent() {
  return useMutation({
    mutationFn: createBillingSetupIntentMe,
  })
}

export function useUpdateBillingPaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateBillingPaymentMethodPayload) =>
      updateBillingSubscriptionPaymentMethod(payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: billingKeys.subscriptionSummaryRoot,
        refetchType: 'active',
      })
    },
  })
}
