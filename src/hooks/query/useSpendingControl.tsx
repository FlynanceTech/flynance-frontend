import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createControl,
  getAllControls,
  updateControl,
  deleteControl,
  CreateControlDTO,
  ControlResponse,
} from "@/services/controls"

export function useControls() {
  const queryClient = useQueryClient()

  // GET - Buscar todos os controles
  const controlsQuery = useQuery<ControlResponse[]>({
    queryKey: ["controls"],
    queryFn: getAllControls,
  })

  // POST - Criar controle
  const createMutation = useMutation({
    mutationFn: (data: CreateControlDTO) => createControl(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controls"] })
    },
  })

  // PUT - Atualizar controle
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateControlDTO> }) =>
        updateControl(id, data),
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["controls"] })
    },
  })

  // DELETE - Remover controle
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteControl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controls"] })
    },
  })

  return {
    controlsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
