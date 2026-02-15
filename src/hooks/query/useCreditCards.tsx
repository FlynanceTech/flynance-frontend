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

export function useCardMutations(cardId?: string, tz?: string) {
    const qc = useQueryClient()
    const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
    const actingContextKey = activeClientId ?? 'self'

    const cardQuery = useQuery<CreditCardResponse[]>({
        queryKey: ['creditCard', actingContextKey],
        queryFn: getCards,
        staleTime: 60_000,
      });
    
    const CardSummary = useQuery<CardSummaryResponse>({
        queryKey: cardId
          ? ['creditCard-summary', { cardId: cardId, actingContextKey }]
          : ['noop', actingContextKey],
        queryFn: () => getCardSummary(cardId!, tz),
        enabled: !!cardId,
        staleTime: 30_000,
    });

    const createCardMutation = useMutation({
        mutationFn: (data: CreditCardDTO) => createCard(data),
        onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['creditCard'] })
        qc.invalidateQueries({ queryKey: ['creditCard-summary'] })
        qc.invalidateQueries({ queryKey: cardKeys.list })
        },
    })

    const updateCardMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CreditCardUpdateDTO }) =>
        updateCard(id, data),
        onSuccess: (updated: CreditCardResponse) => {
        qc.invalidateQueries({ queryKey: ['creditCard'] })
        qc.invalidateQueries({ queryKey: ['creditCard-summary'] })
        qc.invalidateQueries({ queryKey: cardKeys.list })
        qc.invalidateQueries({ queryKey: cardKeys.card(updated.id) })
        qc.invalidateQueries({ queryKey: cardKeys.summary(updated.id) })
        },
    })

    const deleteCardMutation = useMutation({
        mutationFn: (id: string) => deleteCard(id),
        onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['creditCard'] })
        qc.invalidateQueries({ queryKey: ['creditCard-summary'] })
        qc.invalidateQueries({ queryKey: cardKeys.list })
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
