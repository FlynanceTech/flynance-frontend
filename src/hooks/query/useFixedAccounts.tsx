import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFixedAccount,
  deleteFixedAccount,
  FixedAccountDTO,
  FixedAccountPaymentResponse,
  FixedAccountResponse,
  getFixedAccounts,
  getFixedAccountPayments,
  markFixedAccountPaid,
  unmarkFixedAccountPaid,
  updateFixedAccount,
} from '@/services/fixedAccounts'

export function useFixedAccounts(params?: {
  status?: 'active' | 'paused' | 'canceled'
  categoryId?: string
  periodStart?: string
  periodEnd?: string
}) {
  const qc = useQueryClient()

  const fixedAccountsQuery = useQuery<FixedAccountResponse[]>({
    queryKey: ['fixed-accounts', params ?? {}],
    queryFn: () => getFixedAccounts(params),
  })

  const createMutation = useMutation({
    mutationFn: (data: FixedAccountDTO) => createFixedAccount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FixedAccountDTO> }) =>
      updateFixedAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFixedAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (payload: { id: string; data?: { amount?: number; paidAt?: string; dueDate?: string } }) =>
      markFixedAccountPaid(payload.id, payload.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
    },
  })

  const unmarkPaidMutation = useMutation({
    mutationFn: (payload: { id: string; periodKey: string }) =>
      unmarkFixedAccountPaid(payload.id, payload.periodKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
    },
  })

  return {
    fixedAccountsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    markPaidMutation,
    unmarkPaidMutation,
  }
}

export function useFixedAccountPayments(id?: string) {
  return useQuery<FixedAccountPaymentResponse[]>({
    queryKey: ['fixed-accounts', id, 'payments'],
    queryFn: () => getFixedAccountPayments(id as string),
    enabled: !!id,
  })
}
