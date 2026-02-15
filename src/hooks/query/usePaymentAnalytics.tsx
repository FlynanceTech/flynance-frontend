import { useQuery } from '@tanstack/react-query'
import { getPaymentTypeSummary, PaymentTypeSummary } from '@/services/dashboard'
import { useAdvisorActing } from '@/stores/useAdvisorActing'

export function usePaymentTypeSummary(params?: {
  mode?: 'days' | 'month'
  days?: number
  year?: number
  month?: number
}) {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'

  return useQuery<PaymentTypeSummary>({
    queryKey: ['payment-type-summary', actingContextKey, params],
    queryFn: () => getPaymentTypeSummary(params),
  })
}
