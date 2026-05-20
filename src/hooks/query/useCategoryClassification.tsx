import {
  CategoryClassificationBoardResponse,
  CategoryClassificationPatchPayload,
  CategoryClassificationReorderPayload,
  CategoryClassificationUpdatePayload,
  getCategoriesClassificationBoard,
  reorderCategoryClassificationColumn,
  updateCategoryClassification,
  updateCategoriesClassificationBoard,
} from '@/services/category'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useFinancialScope } from '@/hooks/useFinancialScope'
import { useUserSession } from '@/stores/useUserSession'

const CATEGORY_CLASSIFICATION_SESSION_ERROR =
  'Nao foi possivel salvar as alteracoes. Tente novamente.'

export function useCategoryClassificationBoard() {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const sessionStatus = useUserSession((s) => s.status)
  const sessionUserId = useUserSession((s) => s.user?.userData?.user?.id ?? '')
  const actingContextKey = activeClientId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()
  const hasAuthenticatedUser = sessionStatus === 'authenticated' && Boolean(sessionUserId)
  const boardQueryKey = ['categories-classification', actingContextKey, scopeKey, sessionUserId] as const

  const ensureSessionReady = () => {
    if (!hasAuthenticatedUser) {
      throw new Error(CATEGORY_CLASSIFICATION_SESSION_ERROR)
    }
  }

  const boardQuery = useQuery<CategoryClassificationBoardResponse>({
    queryKey: boardQueryKey,
    queryFn: () => getCategoriesClassificationBoard({ actingClientId: activeClientId, scope }),
    enabled: hasAuthenticatedUser,
  })

  const saveBoardMutation = useMutation({
    mutationFn: (payload: CategoryClassificationUpdatePayload) => {
      ensureSessionReady()
      return updateCategoriesClassificationBoard(payload, {
        actingClientId: activeClientId,
        scope,
      })
    },
  })

  const saveCategoryClassificationMutation = useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string
      payload: CategoryClassificationPatchPayload
    }) => {
      ensureSessionReady()
      return updateCategoryClassification(categoryId, payload, {
        actingClientId: activeClientId,
        scope,
      })
    },
  })

  const reorderColumnMutation = useMutation({
    mutationFn: (payload: CategoryClassificationReorderPayload) => {
      ensureSessionReady()
      return reorderCategoryClassificationColumn(payload, {
        actingClientId: activeClientId,
        scope,
      })
    },
  })

  return {
    boardQuery,
    boardQueryKey,
    saveBoardMutation,
    saveCategoryClassificationMutation,
    reorderColumnMutation,
  }
}
