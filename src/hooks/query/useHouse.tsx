'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { usePlans } from '@/hooks/query/usePlan'
import {
  changeBillingSubscriptionPlan,
  createBillingSubscription,
} from '@/services/billing'
import {
  acceptHouseInvite,
  createHouse,
  createHouseInvite,
  extractHouseContextFromAuthMePayload,
  findCouplePlan,
  getHouseContext,
  hasHouseContextInAuthMePayload,
  removeHousePartner,
} from '@/services/houses'
import { useUserSession } from '@/stores/useUserSession'
import type { CreateHousePayload, HouseInvite } from '@/types/house'

export const houseKeys = {
  me: ['house', 'me'] as const,
  couplePlan: ['house', 'couple-plan'] as const,
}

async function refreshHouseQueries(
  fetchAccount: () => Promise<void>,
  queryClient: ReturnType<typeof useQueryClient>
) {
  await fetchAccount()
  await queryClient.invalidateQueries({
    queryKey: houseKeys.me,
    refetchType: 'active',
  })
  await queryClient.invalidateQueries({
    queryKey: ['billing', 'subscription', 'summary'],
    refetchType: 'active',
  })
}

export function useHouseContext(enabled = true) {
  const session = useUserSession((state) => state.user)
  const authHasHouseContext = hasHouseContextInAuthMePayload(session)
  const initialHouseContext = useMemo(
    () => extractHouseContextFromAuthMePayload(session),
    [session]
  )

  return useQuery({
    queryKey: houseKeys.me,
    queryFn: getHouseContext,
    enabled,
    initialData: authHasHouseContext ? initialHouseContext ?? null : undefined,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

export function useCreateHouse() {
  const queryClient = useQueryClient()
  const fetchAccount = useUserSession((state) => state.fetchAccount)

  return useMutation({
    mutationFn: (payload: CreateHousePayload) => createHouse(payload),
    onSuccess: async () => {
      await refreshHouseQueries(fetchAccount, queryClient)
      toast.success('House criada com sucesso.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar a house.')
    },
  })
}

export function useCreateHouseInvite() {
  const queryClient = useQueryClient()
  const fetchAccount = useUserSession((state) => state.fetchAccount)

  return useMutation({
    mutationFn: (): Promise<HouseInvite | null> => createHouseInvite(),
    onSuccess: async () => {
      await refreshHouseQueries(fetchAccount, queryClient)
      toast.success('Convite gerado com sucesso.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar convite.')
    },
  })
}

export function useAcceptHouseInvite() {
  const queryClient = useQueryClient()
  const fetchAccount = useUserSession((state) => state.fetchAccount)

  return useMutation({
    mutationFn: (token: string) => acceptHouseInvite(token),
    onSuccess: async () => {
      await refreshHouseQueries(fetchAccount, queryClient)
      toast.success('Convite aceito com sucesso.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite.')
    },
  })
}

export function useRemoveHousePartner() {
  const queryClient = useQueryClient()
  const fetchAccount = useUserSession((state) => state.fetchAccount)

  return useMutation({
    mutationFn: removeHousePartner,
    onSuccess: async () => {
      await refreshHouseQueries(fetchAccount, queryClient)
      toast.success('Parceiro removido com sucesso.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover parceiro.')
    },
  })
}

export function useCouplePlan() {
  const plansQuery = usePlans()

  const couplePlan = useMemo(
    () => findCouplePlan(plansQuery.data ?? []),
    [plansQuery.data]
  )

  return {
    ...plansQuery,
    couplePlan,
  }
}

export function useCouplePlanUpgrade() {
  const queryClient = useQueryClient()
  const fetchAccount = useUserSession((state) => state.fetchAccount)
  const hasActiveSignature = useUserSession(
    (state) => state.user?.userData?.hasActiveSignature ?? false
  )

  return useMutation({
    mutationFn: async (planId: string) => {
      const safePlanId = String(planId ?? '').trim()
      if (!safePlanId) {
        throw new Error('Plano invalido para upgrade.')
      }

      if (hasActiveSignature) {
        return changeBillingSubscriptionPlan({ planId: safePlanId })
      }

      return createBillingSubscription({ planId: safePlanId })
    },
    onSuccess: async () => {
      await refreshHouseQueries(fetchAccount, queryClient)
      toast.success(
        hasActiveSignature
          ? 'Plano casal solicitado com sucesso.'
          : 'Assinatura do plano casal iniciada com sucesso.'
      )
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar upgrade.')
    },
  })
}
