import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createControl,
  getAllControls,
  updateControl,
  deleteControl,
  CreateControlDTO,
  ControlResponse,
  getControlsById,
  setControlFavorite,
  getFavoriteControls,
} from '@/services/controls'
import { useAdvisorActing } from '@/stores/useAdvisorActing'

export interface ControlWithProgress extends ControlResponse {
  spent: number
  remainingToGoal: number
  usagePctOfGoal: number
  usagePctOfLimit: number
  overLimit: boolean
  periodStart: string
  periodEnd: string
  nextResetAt: string
}

export type FavoriteConflictPayload = {
  message: string
  favorites: Array<{
    id: string
    categoryId: string | null
    categoryName: string | null
    favoriteAt: string | null
  }>
}

export function useControls(id?: string, date?: Date) {
  const qc = useQueryClient()
  const dateKey = date ? date.toISOString().split('T')[0] : 'current'
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'

  const controlsQuery = useQuery<ControlWithProgress[]>({
    queryKey: ['controls', actingContextKey, { withProgress: true, date: dateKey }],
    queryFn: async () => {
      const list = (await getAllControls(true, date)) as ControlWithProgress[]
      if (!date || !Array.isArray(list) || list.length === 0) {
        return list
      }

      // Fallback: garante o mesmo comportamento da tela de detalhe (/controls/:id?date=...)
      // caso o endpoint de listagem não recalcule corretamente por mês.
      const enriched = await Promise.all(
        list.map(async (control) => {
          try {
            return (await getControlsById(control.id, date)) as ControlWithProgress
          } catch {
            return control
          }
        })
      )

      return enriched
    },
  })

  const controlsByIdQuery = useQuery({
    queryKey: ['controls', actingContextKey, id, date?.toISOString()],
    queryFn: () => getControlsById(id as string, date),
    enabled: !!id,
  })

  const favoritesQuery = useQuery({
    queryKey: ['controls', actingContextKey, 'favorites'],
    queryFn: () => getFavoriteControls(),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateControlDTO) => createControl(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['controls'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateControlDTO> }) =>
      updateControl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['controls'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteControl(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['controls'] })
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (params: { id: string; isFavorite: boolean; replaceId?: string }) =>
      setControlFavorite(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['controls'] })
    },
  })

  return {
    controlsQuery,
    controlsByIdQuery,
    favoritesQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    favoriteMutation,
  }
}
