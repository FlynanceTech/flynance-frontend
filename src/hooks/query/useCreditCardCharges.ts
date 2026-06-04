'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFinancialScope } from '@/hooks/useFinancialScope'
import {
  getCreditCardCharges,
  createCreditCardCharge,
  updateCreditCardCharge,
  deleteCreditCardCharge,
  type CreateCreditCardChargeDTO,
  type UpdateCreditCardChargeDTO,
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
  const { scope, scopeKey } = useFinancialScope()
  const { enabled = true, ...queryParams } = params

  const chargesQuery = useQuery({
    queryKey: ['credit-card-charges', scopeKey, queryParams],
    queryFn: () => getCreditCardCharges({ ...queryParams, scope }),
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
      qc.invalidateQueries({ queryKey: ['future-installments'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const updateChargeMutation = useMutation({
    mutationFn: ({ chargeId, data }: { chargeId: string; data: UpdateCreditCardChargeDTO }) =>
      updateCreditCardCharge(chargeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-card-charges'] })
      qc.invalidateQueries({ queryKey: ['future-forecast'] })
      qc.invalidateQueries({ queryKey: ['future-installments'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const deleteChargeMutation = useMutation({
    mutationFn: (chargeId: string) => deleteCreditCardCharge(chargeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-card-charges'] })
      qc.invalidateQueries({ queryKey: ['future-forecast'] })
      qc.invalidateQueries({ queryKey: ['future-installments'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  return {
    chargesQuery,
    createChargeMutation,
    updateChargeMutation,
    deleteChargeMutation,
  }
}
