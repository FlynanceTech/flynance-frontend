import { CategoryResponse, getCategories, createCategory, CategoryDTO, updateCategory, deleteCategory } from '@/services/category'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'


export function useCategories() {
  const queryClient = useQueryClient()
  const setCategoryStore = useCategoryStore((s) => s.setCategoryStore)

  const categoriesQuery = useQuery<CategoryResponse[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await getCategories()
      setCategoryStore(data)
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryDTO }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  return {
    categoriesQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
