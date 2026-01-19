import { useQuery } from "@tanstack/react-query";
import { getLastSignatureByUserId } from "@/services/signature";


export function useSignature(userId?: string, fetchSingle = true) {

const useSignatureByUserId =  useQuery({
    queryKey: ['userId', userId],
    queryFn: () => getLastSignatureByUserId(),
    enabled: fetchSingle && !!userId,
  });

  return {
    useSignatureByUserId
  }
}
