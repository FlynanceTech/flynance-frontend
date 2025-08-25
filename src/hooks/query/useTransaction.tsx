import { createTransaction, deleteTransaction, getTransaction, TransactionDTO, updateTransaction } from "@/services/transactions";
import {  useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cardKeys } from "./cardkeys";

type UseTransactionParams = {
    userId?: string
    page?: number
    limit?: number
    filters?: Record<string, string | number | boolean | undefined>;
  }
  

export function useTranscation(params: UseTransactionParams) {
    const queryClient = useQueryClient()
    
    const transactionsQuery = useQuery({
        enabled: !!params,
        queryKey: ['transactions', params],
        queryFn: () => {
            if (!params.userId) throw new Error('userId é obrigatório')
            return getTransaction(params as Required<UseTransactionParams>)
          },
      })

    const createMutation = useMutation({
        mutationFn: createTransaction,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['financeStatus'] });
            queryClient.invalidateQueries({ queryKey: ['controls', { withProgress: true }] });
                // 🔑 se for crédito e veio cardId, invalida o resumo do cartão
            if (variables?.paymentType === 'CREDIT_CARD' && variables?.cardId) {
                queryClient.invalidateQueries({ queryKey: ['creditCard-summary', { cardId: variables.cardId }] });
                queryClient.invalidateQueries({ queryKey: cardKeys.card(variables.cardId) });
            }
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: TransactionDTO }) =>
            updateTransaction(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({
                predicate: q => Array.isArray(q.queryKey) && q.queryKey[0] === 'cards' && q.queryKey[1] === 'summary',
              });
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteTransaction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
        },
    })

    return {
        transactionsQuery,
        createMutation,
        updateMutation,
        deleteMutation
    }
}