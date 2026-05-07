"use client";

import React from "react";

import { usePlans } from "@/hooks/query/usePlan";
import { findCouplePlan } from "@/services/houses";
import { PlanCard, UiPlan } from "../planos/plancard";
import { mapPlanToUi } from "../planos/utils";
import { FEATURES } from "@/config/features";

const LANDING_ALLOWED_PLAN_SLUGS = new Set(["essencial-mensal", "essencial-anual-lancamento"]);

export default function PricingSection() {
  const { data, isLoading, error } = usePlans();

  const visiblePlans = React.useMemo(() => {
    if (!data) return [];

    const basePlans = data.filter((plan) => plan.isFeatured && LANDING_ALLOWED_PLAN_SLUGS.has(plan.slug));

    if (!FEATURES.COUPLE_ACCOUNT) {
      return basePlans;
    }

    const couplePlan = findCouplePlan(data);

    if (!couplePlan || basePlans.some((plan) => plan.id === couplePlan.id)) {
      return basePlans;
    }

    return [...basePlans, couplePlan];
  }, [data]);

  const uiPlans: UiPlan[] = visiblePlans.map(mapPlanToUi);

  return (
    <section
      id="pricing"
      className="bg-white w-full px-4  py-4 md:py-16 flex flex-col items-center justify-center"
    >
      <div className="flex flex-col w-full gap-8 items-center justify-center">
        <h2 className="text-2xl md:text-3xl font-bold text-primary  text-center px-4">
          Escolha seu plano e comece a economizar
        </h2>

        {/* LOADING */}
        {isLoading && (
          <div className="text-white text-lg mt-10">Carregando planos...</div>
        )}

        {/* ERROR */}
        {error && (
          <div className="text-red-300 font-medium mt-10">
            Não foi possível carregar os planos.
          </div>
        )}

        {/* LISTA DE PLANOS */}
        {!isLoading && data && (
          <div className="w-full flex flex-col md:flex-row gap-8 items-stretch justify-center">
            {uiPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} benefitLimit={8} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
