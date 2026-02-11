import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export async function deleteFixedAccountPayment(paymentId: string): Promise<{ ok: true }> {
  try {
    const response = await api.delete(`/fixed-accounts/payments/${paymentId}`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao remover pagamento.')
    console.error('Erro ao remover pagamento:', msg)
    throw new Error(msg)
  }
}
