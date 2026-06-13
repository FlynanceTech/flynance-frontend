import { useQuery } from '@tanstack/react-query'
import { getMyAdvisor, MyAdvisorInfo } from '@/services/advisor'
import { useAdvisorActing } from '@/stores/useAdvisorActing'

/**
 * Hook para o CLIENTE verificar se possui um advisor vinculado.
 * Retorna null quando o usuário não tem advisor.
 *
 * Quando um ADVISOR está atuando como cliente (activeClientId preenchido),
 * o hook retorna { hasAdvisor: false } para não bloquear as ações do advisor.
 */
export function useMyAdvisor() {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const isAdvisorActing = Boolean(activeClientId)

  const query = useQuery<MyAdvisorInfo | null>({
    queryKey: ['my-advisor'],
    queryFn: getMyAdvisor,
    staleTime: 5 * 60 * 1000,
    enabled: !isAdvisorActing,
  })

  return {
    myAdvisor: isAdvisorActing ? null : (query.data ?? null),
    hasAdvisor: !isAdvisorActing && Boolean(query.data),
    isAdvisorActing,
    isLoading: !isAdvisorActing && query.isLoading,
  }
}
