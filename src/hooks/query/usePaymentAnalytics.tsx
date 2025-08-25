import { useQuery } from '@tanstack/react-query'
import { getPaymentTypeSummary, PaymentTypeSummary } from '@/services/dashboard'

export function usePaymentTypeSummary(params?: {
  mode?: 'days' | 'month'
  days?: number
  year?: number
  month?: number
}) {
  return useQuery<PaymentTypeSummary>({
    queryKey: ['payment-type-summary', params],
    queryFn: () => getPaymentTypeSummary(params),
  })
}