import { CategoryResponse, getCategories, createCategory, CategoryDTO, updateCategory, deleteCategory } from '@/services/category'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFinancialScope } from '@/hooks/useFinancialScope'


export function useCategories() {
  const queryClient = useQueryClient()
  const setCategoryStore = useCategoryStore((s) => s.setCategoryStore)
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()

  const categoriesQuery = useQuery<CategoryResponse[]>({
    queryKey: ['categories', actingContextKey, scopeKey],
    queryFn: async () => {
      const data = await getCategories({ actingClientId: activeClientId, scope })
      setCategoryStore(data)
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: CategoryDTO) =>
      createCategory(payload, { actingClientId: activeClientId, scope }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories-classification'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryDTO }) =>
      updateCategory(id, data, { actingClientId: activeClientId, scope }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories-classification'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteCategory(id, { actingClientId: activeClientId, scope }),
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
