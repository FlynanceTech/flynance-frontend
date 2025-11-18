"use client";

import { PageHeader } from "@/components/planos/PageHeader";
import { PlanCard } from "@/components/planos/plancard";
import { usePlans } from "@/hooks/query/usePlan";
import type { PlansResponse } from "@/types/plan";

type UiPlan = {
  id: string;
  slug: string;
  title: string;
  price: string;
  priceSuffix: string;
  previousPrice?: string;
  badge?: string;
  badgeType?: "primary" | "discount";
  ctaLabel: string;
  benefits: string[];
};

const DEFAULT_BENEFITS = [
  "Gastos categorizados automaticamente",
  "Metas mensais com alertas inteligentes",
  "Relatórios completos e projeções financeiras",
  "Dashboard avançado e em tempo real",
];

function mapPlanToUi(plan: PlansResponse): UiPlan {
  const isYearly = plan.period === "YEARLY";

  // preço base em reais
  const baseValue = plan.priceCents / 100;

  // no anual você quer mostrar o valor mensal equivalente
  const monthlyValue = isYearly ? baseValue / 12 : baseValue;

  const formattedPrice = monthlyValue
    .toFixed(2)
    .replace(".", ",");

  return {
    id: plan.id,
    slug: plan.slug,
    title: isYearly ? "12 meses" : "1 mês",
    price: formattedPrice,
    priceSuffix: "/ mês",
    previousPrice: isYearly ? "19,90" : undefined, // opcional: você pode puxar isso do backend depois
    badge: isYearly ? "10% OFF" : "Popular",
    badgeType: isYearly ? "discount" : "primary",
    ctaLabel: isYearly ? "Garanta já 10% OFF" : "Testar Gratuitamente",
    benefits:
      plan.features && plan.features.length > 0
        ? plan.features.map((f) => f.label)
        : DEFAULT_BENEFITS,
  };
}

export default function PlanosPage() {
  const { data, isLoading, isError } = usePlans();

  const uiPlans: UiPlan[] = data ? data.map(mapPlanToUi) : [];

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-r from-primary to-secondary">
      <PageHeader title="Planos da Flynance" showBack />

      {/* HERO */}
      <div className="text-center pt-24 pb-10 px-4">
        <h1 className="text-4xl font-semibold text-white drop-shadow">
          Escolha seu plano e comece a economizar
        </h1>
      </div>

      {/* ESTADOS */}
      {isLoading && (
        <div className="flex justify-center items-center pb-20">
          <div className="w-8 h-8 rounded-full border-4 border-white border-t-transparent animate-spin" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="text-white/90 pb-20 text-center">
          Ocorreu um erro ao carregar os planos. Tente novamente mais tarde.
        </div>
      )}

      {/* PLANOS */}
      {!isLoading && !isError && (
        <div className="flex flex-col md:flex-row justify-center gap-10 px-6 pb-20 w-full max-w-5xl">
          {uiPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
