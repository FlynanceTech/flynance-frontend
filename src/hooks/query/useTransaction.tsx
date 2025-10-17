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
        queryKey: ['transactions', params],          // chave depende de params (memoizado no caller)
        queryFn: () => getTransaction(params as Required<UseTransactionParams>),
        enabled: !!params.userId,                    // <<< só roda quando userId existir
        staleTime: 30_000,
        retry: 1,
    });

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