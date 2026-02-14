'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBillingSetupIntentMe,
  getBillingSubscriptionSummary,
  UpdateBillingPaymentMethodPayload,
  updateBillingSubscriptionPaymentMethod,
} from '@/services/billing'

export const billingKeys = {
  subscriptionSummary: ['billing', 'subscription', 'summary'] as const,
}

export function useBillingSubscriptionSummary(enabled = true) {
  return useQuery({
    queryKey: billingKeys.subscriptionSummary,
    queryFn: getBillingSubscriptionSummary,
    enabled,
    staleTime: 20_000,
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
      qc.invalidateQueries({ queryKey: billingKeys.subscriptionSummary })
    },
  })
}
