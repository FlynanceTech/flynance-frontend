import { getFinanceStatus } from "@/services/dashboard";
import { useQuery } from "@tanstack/react-query"

export function useFinanceStatus({ days, month }: { days?: number; month?: string }) {
  return useQuery({
    queryKey: ["finance-status", { days, month }],
    queryFn: () => getFinanceStatus({ days, month }),
  })
}
