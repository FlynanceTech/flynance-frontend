import { QueryClient, QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFixedAccount,
  deleteFixedAccount,
  FixedAccountDTO,
  FixedAccountPaymentResponse,
  FixedAccountResponse,
  getFixedAccount,
  getFixedAccounts,
  getFixedAccountPayments,
  markFixedAccountPaid,
  unmarkFixedAccountPaid,
  updateFixedAccount,
} from '@/services/fixedAccounts'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { deleteFixedAccountPayment } from '@/services/fixedAccountPayments'
import { FinancialScopeKey } from '@/lib/financialScope'
import { useFinancialScope } from '@/hooks/useFinancialScope'

function monthKeyFromISO(iso?: string) {
  const raw = String(iso ?? '').trim()
  if (!raw) return ''

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}`

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function todayISODate() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

type MarkPaidPayload = {
  id: string
  data?: { amount?: number; paidAt?: string; dueDate?: string }
  optimisticPeriodKey?: string
}

type FixedAccountsSnapshot = Array<[QueryKey, FixedAccountResponse[] | undefined]>

export type FixedAccountsQueryParams = {
  status?: 'active' | 'paused' | 'canceled'
  categoryId?: string
  periodStart?: string
  periodEnd?: string
}

export async function refetchFixedAccountsMonth(
  qc: Pick<QueryClient, 'invalidateQueries' | 'refetchQueries'>,
  actingContextKey: string,
  scopeKey: FinancialScopeKey,
  params?: FixedAccountsQueryParams
) {
  const queryKey = ['fixed-accounts', actingContextKey, scopeKey, params ?? {}] as const
  await qc.invalidateQueries({ queryKey })
  await qc.refetchQueries({ queryKey, type: 'active', exact: true })
}

export async function refetchFixedAccountDetail(
  qc: Pick<QueryClient, 'invalidateQueries' | 'refetchQueries'>,
  actingContextKey: string,
  scopeKey: FinancialScopeKey,
  id?: string
) {
  if (!id) return
  const detailQueryKey = ['fixed-account', actingContextKey, scopeKey, id] as const
  await qc.invalidateQueries({ queryKey: detailQueryKey })
  await qc.refetchQueries({ queryKey: detailQueryKey, type: 'active', exact: true })
  await qc.invalidateQueries({ queryKey: ['fixed-accounts', actingContextKey, scopeKey, id, 'payments'] })
}

function restoreSnapshot(qc: ReturnType<typeof useQueryClient>, snapshot?: FixedAccountsSnapshot) {
  if (!snapshot?.length) return
  snapshot.forEach(([queryKey, data]) => {
    qc.setQueryData(queryKey, data)
  })
}

function patchFixedAccountsCache(
  qc: ReturnType<typeof useQueryClient>,
  updater: (list: FixedAccountResponse[]) => FixedAccountResponse[]
) {
  const entries = qc.getQueriesData<FixedAccountResponse[]>({ queryKey: ['fixed-accounts'] })
  entries.forEach(([queryKey, current]) => {
    if (!Array.isArray(current)) return
    qc.setQueryData(queryKey, updater(current))
  })
  return entries as FixedAccountsSnapshot
}

export function useFixedAccounts(params?: FixedAccountsQueryParams) {
  const qc = useQueryClient()
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()

  const fixedAccountsQuery = useQuery<FixedAccountResponse[]>({
    queryKey: ['fixed-accounts', actingContextKey, scopeKey, params ?? {}],
    queryFn: () => getFixedAccounts(params, scope),
    staleTime: 15_000,
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
    mutationFn: (payload: MarkPaidPayload) =>
      markFixedAccountPaid(payload.id, payload.data),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['fixed-accounts'] })

      const previous = patchFixedAccountsCache(qc, (list) =>
        list.map((row) => {
          if (row.id !== payload.id) return row

          const paidAt = payload.data?.paidAt ?? row.payment?.paidAt ?? todayISODate()
          const dueDate = payload.data?.dueDate ?? row.payment?.dueDate ?? row.dueDate ?? null
          const periodKey =
            payload.optimisticPeriodKey ||
            row.payment?.periodKey ||
            monthKeyFromISO(dueDate ?? paidAt) ||
            monthKeyFromISO(paidAt)

          return {
            ...row,
            isPaid: true,
            statusCurrentCycle: 'PAID',
            payment: {
              id: row.payment?.id ?? `optimistic-${row.id}-${periodKey}`,
              amount: payload.data?.amount ?? row.payment?.amount ?? row.amount,
              paidAt,
              dueDate,
              periodKey,
              createdAt: row.payment?.createdAt,
            },
            paymentCurrentCycle: {
              id: row.paymentCurrentCycle?.id ?? `optimistic-${row.id}-${periodKey}`,
              amount: payload.data?.amount ?? row.paymentCurrentCycle?.amount ?? row.amount,
              paidAt,
              dueDate,
              periodKey,
              createdAt: row.paymentCurrentCycle?.createdAt,
            },
            payments: [
              {
                id: row.paymentCurrentCycle?.id ?? `optimistic-${row.id}-${periodKey}`,
                amount: payload.data?.amount ?? row.paymentCurrentCycle?.amount ?? row.amount,
                paidAt,
                dueDate,
                periodKey,
                createdAt: row.paymentCurrentCycle?.createdAt,
              },
              ...(row.payments ?? []).filter((payment) => payment.periodKey !== periodKey),
            ],
          }
        })
      )

      return { previous }
    },
    onError: (_error, _payload, context) => {
      restoreSnapshot(qc, context?.previous)
    },
    onSettled: async (_data, _error, payload) => {
      await refetchFixedAccountsMonth(qc, actingContextKey, scopeKey, params)
      await refetchFixedAccountDetail(qc, actingContextKey, scopeKey, payload?.id)
    },
  })

  const unmarkPaidMutation = useMutation({
    mutationFn: (payload: { id: string; periodKey: string }) =>
      unmarkFixedAccountPaid(payload.id, payload.periodKey),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['fixed-accounts'] })

      const previous = patchFixedAccountsCache(qc, (list) =>
        list.map((row) => {
          if (row.id !== payload.id) return row
          if (row.payment?.periodKey && row.payment.periodKey !== payload.periodKey) return row

          return {
            ...row,
            isPaid: false,
            payment: null,
            paymentCurrentCycle: null,
            statusCurrentCycle: 'PENDING',
            payments: (row.payments ?? []).filter((payment) => payment.periodKey !== payload.periodKey),
          }
        })
      )

      return { previous }
    },
    onError: (_error, _payload, context) => {
      restoreSnapshot(qc, context?.previous)
    },
    onSettled: async (_data, _error, payload) => {
      await refetchFixedAccountsMonth(qc, actingContextKey, scopeKey, params)
      await refetchFixedAccountDetail(qc, actingContextKey, scopeKey, payload?.id)
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

export function useFixedAccount(id?: string) {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()

  return useQuery<FixedAccountResponse>({
    queryKey: ['fixed-account', actingContextKey, scopeKey, id],
    queryFn: () => getFixedAccount(id as string, scope),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

export function useFixedAccountPayments(id?: string) {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()

  return useQuery<FixedAccountPaymentResponse[]>({
    queryKey: ['fixed-accounts', actingContextKey, scopeKey, id, 'payments'],
    queryFn: () => getFixedAccountPayments(id as string, scope),
    enabled: !!id,
  })
}

export function useDeleteFixedAccountPayment(fixedAccountId?: string) {
  const qc = useQueryClient()
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'
  const { scopeKey } = useFinancialScope()

  return useMutation({
    mutationFn: (paymentId: string) => deleteFixedAccountPayment(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
      if (fixedAccountId) {
        qc.invalidateQueries({
          queryKey: ['fixed-account', actingContextKey, scopeKey, fixedAccountId],
        })
        qc.invalidateQueries({
          queryKey: ['fixed-accounts', actingContextKey, scopeKey, fixedAccountId, 'payments'],
        })
      } else {
        qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
      }
    },
  })
}
