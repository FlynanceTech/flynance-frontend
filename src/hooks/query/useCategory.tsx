import { CategoryResponse, getCategories, createCategory, CategoryDTO, updateCategory, deleteCategory } from '@/services/category'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFinancialScope } from '@/hooks/useFinancialScope'
import { useUserSession } from '@/stores/useUserSession'

const CATEGORY_SESSION_ERROR = 'Nao foi possivel salvar a categoria. Tente novamente.'

export function useCategories() {
  const queryClient = useQueryClient()
  const setCategoryStore = useCategoryStore((s) => s.setCategoryStore)
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const sessionStatus = useUserSession((s) => s.status)
  const sessionUserId = useUserSession((s) => s.user?.userData?.user?.id ?? '')
  const actingContextKey = activeClientId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()
  const hasAuthenticatedUser = sessionStatus === 'authenticated' && Boolean(sessionUserId)

  const ensureSessionReady = () => {
    if (!hasAuthenticatedUser) {
      throw new Error(CATEGORY_SESSION_ERROR)
    }
  }

  const categoriesQuery = useQuery<CategoryResponse[]>({
    queryKey: ['categories', actingContextKey, scopeKey, sessionUserId],
    queryFn: async () => {
      const data = await getCategories({ actingClientId: activeClientId, scope })
      setCategoryStore(data)
      return data
    },
    enabled: hasAuthenticatedUser,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CategoryDTO) => {
      ensureSessionReady()
      return createCategory(payload, { actingClientId: activeClientId, scope })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories-classification'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryDTO }) => {
      ensureSessionReady()
      return updateCategory(id, data, { actingClientId: activeClientId, scope })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories-classification'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      ensureSessionReady()
      return deleteCategory(id, { actingClientId: activeClientId, scope })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories-classification'] })
    },
  })

  return {
    categoriesQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
