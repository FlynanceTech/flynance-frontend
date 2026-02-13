'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInstallmentPlan,
  deleteInstallment,
  getFutureForecast,
  getFutureInstallmentPlans,
  getFutureInstallments,
  ListInstallmentPlansParams,
  ListInstallmentsParams,
  settleFutureInstallment,
  SettleInstallmentDTO,
  CreateInstallmentPlanDTO,
  UpdateInstallmentDTO,
  UpdateInstallmentPlanPayload,
  updateInstallmentPlan,
  deleteInstallmentPlan,
  updateInstallment,
} from '@/services/futureService'

export function useFuturePlans(
  params: ListInstallmentPlansParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['future-plans', params],
    queryFn: () => getFutureInstallmentPlans(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useFutureInstallments(
  params: ListInstallmentsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['future-installments', params],
    queryFn: () => getFutureInstallments(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useFutureForecast(params: { from?: string; to?: string; days?: number }) {
  return useQuery({
    queryKey: ['future-forecast', params],
    queryFn: () => getFutureForecast(params),
    staleTime: 30_000,
    retry: 1,
  })
}

export function useFutureMutations() {
  const qc = useQueryClient()

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['future-plans'] })
    qc.invalidateQueries({ queryKey: ['future-installments'] })
    qc.invalidateQueries({ queryKey: ['future-forecast'] })
  }

  const createPlanMutation = useMutation({
    mutationFn: (payload: CreateInstallmentPlanDTO) => createInstallmentPlan(payload),
    onSuccess: invalidateAll,
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInstallmentPlanPayload }) =>
      updateInstallmentPlan(id, payload),
    onSuccess: invalidateAll,
  })

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => deleteInstallmentPlan(id),
    onSuccess: invalidateAll,
  })

  const settleInstallmentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body?: SettleInstallmentDTO }) =>
      settleFutureInstallment(id, body),
    onSuccess: invalidateAll,
  })

  const updateInstallmentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInstallmentDTO }) =>
      updateInstallment(id, payload),
    onSuccess: invalidateAll,
  })

  const deleteInstallmentMutation = useMutation({
    mutationFn: (id: string) => deleteInstallment(id),
    onSuccess: invalidateAll,
  })

  return {
    createPlanMutation,
    updatePlanMutation,
    deletePlanMutation,
    settleInstallmentMutation,
    updateInstallmentMutation,
    deleteInstallmentMutation,
  }
}
