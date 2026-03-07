import {
  CategoryClassificationBoardResponse,
  CategoryClassificationPatchPayload,
  CategoryClassificationUpdatePayload,
  getCategoriesClassificationBoard,
  updateCategoryClassification,
  updateCategoriesClassificationBoard,
} from '@/services/category'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useCategoryClassificationBoard() {
  const queryClient = useQueryClient()
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'
  const boardQueryKey = ['categories-classification', actingContextKey] as const

  const boardQuery = useQuery<CategoryClassificationBoardResponse>({
    queryKey: boardQueryKey,
    queryFn: () => getCategoriesClassificationBoard({ actingClientId: activeClientId }),
  })

  const saveBoardMutation = useMutation({
    mutationFn: (payload: CategoryClassificationUpdatePayload) =>
      updateCategoriesClassificationBoard(payload, { actingClientId: activeClientId }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardQueryKey, board)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const saveCategoryClassificationMutation = useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string
      payload: CategoryClassificationPatchPayload
    }) => updateCategoryClassification(categoryId, payload, { actingClientId: activeClientId }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardQueryKey, board)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  return {
    boardQuery,
    saveBoardMutation,
    saveCategoryClassificationMutation,
  }
}
