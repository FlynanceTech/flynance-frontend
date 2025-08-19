import { createTransaction, deleteTransaction, getTransaction, TransactionDTO, updateTransaction } from "@/services/transactions";
import {  useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: TransactionDTO }) =>
            updateTransaction(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
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