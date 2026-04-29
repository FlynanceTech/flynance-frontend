'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCreditCardCharges,
  createCreditCardCharge,
  type CreateCreditCardChargeDTO,
} from '@/services/creditCardCharges'

export interface UseCreditCardChargesParams {
  cardId?: string
  categoryId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
  enabled?: boolean
}

export function useCreditCardCharges(params: UseCreditCardChargesParams = {}) {
  const qc = useQueryClient()
  const { enabled = true, ...queryParams } = params

  const chargesQuery = useQuery({
    queryKey: ['credit-card-charges', queryParams],
    queryFn: () => getCreditCardCharges(queryParams),
    enabled,
    staleTime: 30_000,
    retry: 1,
  })

  const createChargeMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: CreateCreditCardChargeDTO }) =>
      createCreditCardCharge(cardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-card-charges'] })
      qc.invalidateQueries({ queryKey: ['future-forecast'] })
    },
  })

  return {
    chargesQuery,
    createChargeMutation,
  }
}
