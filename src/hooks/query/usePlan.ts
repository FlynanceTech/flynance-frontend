"use client";

import { useQuery } from "@tanstack/react-query";
import { listPlans, getPlan, getPlanBySlug } from "@/services/plan";

import { plansKeys } from "./keys";

// Lista todos os planos
export function usePlans() {
  return useQuery({
    queryKey: plansKeys.list(),
    queryFn: ({ signal }) => listPlans(signal),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// Detalhe por ID
export function usePlan(id?: string) {
  return useQuery({
    queryKey: plansKeys.detail(id ?? "unknown"),
    queryFn: ({ signal }) => getPlan(id as string, signal),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function usePlanBySlug(slug?: string) {
  return useQuery({
    queryKey: plansKeys.bySlug(slug ?? "unknown"),
    queryFn: ({ signal }) => getPlanBySlug(slug as string, signal),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
