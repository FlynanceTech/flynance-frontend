import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createControl,
  getAllControls,
  updateControl,
  deleteControl,
  CreateControlDTO,
  ControlResponse,
} from '@/services/controls'

export function useControls() {
  const qc = useQueryClient()

  const controlsQuery = useQuery<ControlResponse[] | unknown[]>({
    queryKey: ['controls', { withProgress: true }],
    queryFn: () => getAllControls(true), // já busca com progresso
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

  return { controlsQuery, createMutation, updateMutation, deleteMutation }
}
