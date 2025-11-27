// services/plans.ts
import api from "@/lib/axios";
import { PlansResponse } from "@/types/plan";

export async function listPlans(signal?: AbortSignal): Promise<PlansResponse[]> {
  const { data } = await api.get<PlansResponse[]>("/plans", { signal });
  return data;
}

export async function getPlan(id: string, signal?: AbortSignal): Promise<PlansResponse> {
  const { data } = await api.get<PlansResponse>(`/plans/${id}`, { signal });
  return data;
}

// opcional, se você tiver rota por slug:
export async function getPlanBySlug(slug: string, signal?: AbortSignal): Promise<PlansResponse> {
  const { data } = await api.get<PlansResponse>(`/plan/slug/${slug}`, { signal });
  return data;
}
  