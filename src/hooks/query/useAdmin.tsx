'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  acceptAdvisorInvite,
  AdminPlan,
  AdminPlansParams,
  AdminLeadsParams,
  createAdvisorInvite,
  createAdminPlan,
  AcceptAdvisorInvitePayload,
  CreateAdvisorInvitePayload,
  createCoupon,
  CreateCouponPayload,
  createPrice,
  CreatePricePayload,
  createProduct,
  CreateProductPayload,
  createPromoCode,
  CreatePromoCodePayload,
  disablePrice,
  disablePromoCode,
  deleteAdminPlan,
  getAdminLeads,
  getAdminMetrics,
  getAdminPlanById,
  getAdminPlans,
  getAdvisorInvites,
  getStripeCoupons,
  getStripeProducts,
  revokeAdvisorInvite,
  updateAdminPlan,
  UpsertAdminPlanPayload,
} from '@/services/admin'

const adminKeys = {
  metrics: ['admin', 'metrics'] as const,
  advisorInvites: (params?: { page?: number; limit?: number }) =>
    ['admin', 'advisor-invites', params ?? {}] as const,
  leads: (params?: AdminLeadsParams) => ['admin', 'leads', params ?? {}] as const,
  plans: (params?: AdminPlansParams) => ['admin', 'plans', params ?? {}] as const,
  plan: (planId?: string) => ['admin', 'plans', 'detail', planId ?? ''] as const,
  coupons: ['admin', 'billing', 'coupons'] as const,
  products: ['admin', 'billing', 'products'] as const,
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: adminKeys.metrics,
    queryFn: getAdminMetrics,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useAdvisorInvites(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: adminKeys.advisorInvites(params),
    queryFn: () => getAdvisorInvites(params),
    staleTime: 20_000,
    retry: 1,
  })
}

export function useCreateAdvisorInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAdvisorInvitePayload) => createAdvisorInvite(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'advisor-invites'] })
      toast.success('Convite de advisor gerado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar convite.')
    },
  })
}

export function useRevokeAdvisorInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => revokeAdvisorInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'advisor-invites'] })
      toast.success('Convite revogado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao revogar convite.')
    },
  })
}

export function useAcceptAdvisorInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AcceptAdvisorInvitePayload) => acceptAdvisorInvite(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'advisor-invites'] })
      toast.success('Convite aceito com sucesso.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite.')
    },
  })
}

export function useAdminLeads(params: AdminLeadsParams) {
  return useQuery({
    queryKey: adminKeys.leads(params),
    queryFn: () => getAdminLeads(params),
    staleTime: 20_000,
    retry: 1,
  })
}

export function useAdminPlans(params?: AdminPlansParams) {
  return useQuery({
    queryKey: adminKeys.plans(params),
    queryFn: () => getAdminPlans(params),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })
}

export function useAdminPlan(planId?: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.plan(planId),
    queryFn: () => getAdminPlanById(planId as string),
    enabled: enabled && Boolean(planId),
    staleTime: 20_000,
    retry: 1,
  })
}

export function useCreateAdminPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertAdminPlanPayload) => createAdminPlan(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
      toast.success('Plano criado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar plano.')
    },
  })
}

export function useUpdateAdminPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: Partial<UpsertAdminPlanPayload> }) =>
      updateAdminPlan(planId, payload),
    onSuccess: (plan: AdminPlan) => {
      qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
      qc.setQueryData(adminKeys.plan(plan.id), plan)
      toast.success('Plano atualizado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar plano.')
    },
  })
}

export function useDeleteAdminPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, hardDelete }: { planId: string; hardDelete?: boolean }) =>
      deleteAdminPlan(planId, hardDelete),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
      qc.removeQueries({ queryKey: adminKeys.plan(vars.planId) })
      toast.success(vars.hardDelete ? 'Plano excluido definitivamente.' : 'Plano removido.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir plano.')
    },
  })
}

export function useStripeCoupons() {
  return useQuery({
    queryKey: adminKeys.coupons,
    queryFn: getStripeCoupons,
    staleTime: 20_000,
    retry: 1,
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCouponPayload) => createCoupon(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.coupons })
      toast.success('Cupom criado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar cupom.')
    },
  })
}

export function useCreatePromoCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePromoCodePayload) => createPromoCode(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.coupons })
      toast.success('Promotion code criado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar promotion code.')
    },
  })
}

export function useDisablePromoCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (promoCodeId: string) => disablePromoCode(promoCodeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.coupons })
      toast.success('Promotion code desativado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar promotion code.')
    },
  })
}

export function useStripeProducts() {
  return useQuery({
    queryKey: adminKeys.products,
    queryFn: getStripeProducts,
    staleTime: 20_000,
    retry: 1,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.products })
      toast.success('Produto criado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar produto.')
    },
  })
}

export function useCreatePrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePricePayload) => createPrice(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.products })
      toast.success('Price criado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar price.')
    },
  })
}

export function useDisablePrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (priceId: string) => disablePrice(priceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.products })
      toast.success('Price desativado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar price.')
    },
  })
}
