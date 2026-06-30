// src/hooks/query/useCardMutations.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCard,
  updateCard,
  deleteCard,
  getCards,
  type CreditCardDTO,
  type CreditCardUpdateDTO,
  type CreditCardResponse,
  getCardSummary,
  CardSummaryResponse,
  payCreditCardStatement,
  type PayCreditCardStatementDTO,
} from '@/services/cards'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { cardKeys } from './cardkeys' // <-- corrige o path/case
import { useFinancialScope } from '@/hooks/useFinancialScope'

export function useCardMutations(cardId?: string, tz?: string) {
    const qc = useQueryClient()
    const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
    const actingContextKey = activeClientId ?? 'self'
    const { scope, scopeKey } = useFinancialScope()
    const listKey = cardKeys.list(actingContextKey, scopeKey)

    const cardQuery = useQuery<CreditCardResponse[]>({
        queryKey: listKey,
        queryFn: () => getCards(scope),
        staleTime: 60_000,
      });
    
    const CardSummary = useQuery<CardSummaryResponse>({
        queryKey: cardId
          ? cardKeys.summary(cardId, actingContextKey, scopeKey, tz)
          : ['cards', 'summary', actingContextKey, scopeKey, 'noop'],
        queryFn: () => getCardSummary(cardId!, tz, scope),
        enabled: !!cardId,
        staleTime: 30_000,
    });

    const createCardMutation = useMutation({
        mutationFn: (data: CreditCardDTO) => createCard(data),
        onMutate: async (data) => {
        await qc.cancelQueries({ queryKey: listKey })
        const previous = qc.getQueryData<CreditCardResponse[]>(listKey)
        const optimisticCard: CreditCardResponse = {
            id: `optimistic-${Date.now()}`,
            userId: 'optimistic',
            name: data.name,
            brand: data.brand,
            last4: data.last4 ?? null,
            limit: data.limit,
            closingDay: data.closingDay,
            dueDay: data.dueDay,
            timezone: data.timezone ?? null,
            isActive: true,
            createdAt: new Date().toISOString(),
        }
        qc.setQueryData<CreditCardResponse[]>(listKey, (current) => [
            optimisticCard,
            ...(current ?? []),
        ])
        return { previous }
        },
        onError: (_error, _variables, context) => {
        if (context?.previous) qc.setQueryData(listKey, context.previous)
        },
        onSettled: () => {
        qc.invalidateQueries({ queryKey: ['cards'] })
        },
    })

    const updateCardMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CreditCardUpdateDTO }) =>
        updateCard(id, data),
        onMutate: async ({ id, data }) => {
        await qc.cancelQueries({ queryKey: listKey })
        const previous = qc.getQueryData<CreditCardResponse[]>(listKey)
        qc.setQueryData<CreditCardResponse[]>(listKey, (current) => {
            const cards = current ?? []
            if (data.isActive === false) {
            return cards.filter((card) => card.id !== id)
            }
            return cards.map((card) => (card.id === id ? { ...card, ...data } : card))
        })
        return { previous }
        },
        onError: (_error, _variables, context) => {
        if (context?.previous) qc.setQueryData(listKey, context.previous)
        },
        onSuccess: (updated: CreditCardResponse) => {
        qc.invalidateQueries({ queryKey: ['cards'] })
        qc.invalidateQueries({ queryKey: cardKeys.card(updated.id, actingContextKey, scopeKey) })
        qc.invalidateQueries({ queryKey: cardKeys.summary(updated.id, actingContextKey, scopeKey) })
        },
    })

    const deleteCardMutation = useMutation({
        mutationFn: (id: string) => deleteCard(id),
        onMutate: async (id) => {
        await qc.cancelQueries({ queryKey: listKey })
        const previous = qc.getQueryData<CreditCardResponse[]>(listKey)
        qc.setQueryData<CreditCardResponse[]>(listKey, (current) =>
            (current ?? []).filter((card) => card.id !== id)
        )
        return { previous }
        },
        onError: (_error, _variables, context) => {
        if (context?.previous) qc.setQueryData(listKey, context.previous)
        },
        onSettled: () => {
        qc.invalidateQueries({ queryKey: ['cards'] })
        },
    })

    const payStatementMutation = useMutation({
        mutationFn: ({ statementId, data }: { statementId: string; data?: PayCreditCardStatementDTO }) =>
        payCreditCardStatement(statementId, data),
        onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['cards'] })
        qc.invalidateQueries({ queryKey: ['cards', 'statements'] })
        qc.invalidateQueries({ queryKey: ['future-forecast'] })
        qc.invalidateQueries({ queryKey: ['future-installments'] })
        qc.invalidateQueries({ queryKey: ['future-plans'] })
        qc.invalidateQueries({ queryKey: ['credit-card-charges'] })
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['financeStatus'] })
        qc.invalidateQueries({ queryKey: ['payment-type-summary'] })
        qc.invalidateQueries({ queryKey: ['controls', { withProgress: true }] })
        qc.invalidateQueries({ queryKey: ['fixed-accounts'] })
        qc.invalidateQueries({
            predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === 'cards' &&
            q.queryKey[1] === 'summary',
        })
        },
    })

    return {
        cardQuery,
        CardSummary,
        createCardMutation,
        updateCardMutation,
        deleteCardMutation,
        payStatementMutation,
    }
}
