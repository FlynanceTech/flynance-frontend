import { useQuery } from '@tanstack/react-query'
import { getPaymentTypeSummary, PaymentTypeSummary } from '@/services/dashboard'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useFinancialScope } from '@/hooks/useFinancialScope'

export function usePaymentTypeSummary(params?: {
  mode?: 'days' | 'month'
  days?: number
  year?: number
  month?: number
}) {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()

  return useQuery<PaymentTypeSummary>({
    queryKey: ['payment-type-summary', actingContextKey, scopeKey, params],
    queryFn: () => getPaymentTypeSummary({ ...params, scope }),
  })
}
