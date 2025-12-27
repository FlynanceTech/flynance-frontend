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

  const controlsQuery = useQuery<ControlWithProgress[]>({
    queryKey: ['controls', { withProgress: true }],
    queryFn: () => getAllControls(true),
  })

  const controlsByIdQuery = useQuery({
    queryKey: ['controls', id, date?.toISOString()],
    queryFn: () => getControlsById(id as string, date),
    enabled: !!id,
  })

  const favoritesQuery = useQuery({
    queryKey: ['controls', 'favorites'],
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
