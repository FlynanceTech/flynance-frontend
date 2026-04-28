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
} from '@/services/cards'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { cardKeys } from './cardkeys' // <-- corrige o path/case
import { useFinancialScope } from '@/hooks/useFinancialScope'

export function useCardMutations(cardId?: string, tz?: string) {
    const qc = useQueryClient()
    const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
    const actingContextKey = activeClientId ?? 'self'
    const { scope, scopeKey } = useFinancialScope()

    const cardQuery = useQuery<CreditCardResponse[]>({
        queryKey: cardKeys.list(actingContextKey, scopeKey),
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
        onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['cards'] })
        },
    })

    const updateCardMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CreditCardUpdateDTO }) =>
        updateCard(id, data),
        onSuccess: (updated: CreditCardResponse) => {
        qc.invalidateQueries({ queryKey: ['cards'] })
        qc.invalidateQueries({ queryKey: cardKeys.card(updated.id, actingContextKey, scopeKey) })
        qc.invalidateQueries({ queryKey: cardKeys.summary(updated.id, actingContextKey, scopeKey) })
        },
    })

    const deleteCardMutation = useMutation({
        mutationFn: (id: string) => deleteCard(id),
        onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['cards'] })
        },
    })

    return {
        cardQuery,
        CardSummary,
        createCardMutation,
        updateCardMutation,
        deleteCardMutation,
    }
}
