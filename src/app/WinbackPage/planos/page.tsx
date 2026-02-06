"use client";

import { PageHeader } from "@/components/planos/PageHeader";
import { PlanCard, UiPlan } from "@/components/planos/plancard";
import PlansFaq from "@/components/planos/PlansFaq";
import { mapPlanToUi } from "@/components/planos/utils";
import { usePlans } from "@/hooks/query/usePlan";
import { useUserSession } from "@/stores/useUserSession";
import { useEffect } from "react";


export default function PlanosPage() {
  const { data, isLoading, isError } = usePlans();
  const {fetchAccount} = useUserSession()
  
  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);
  

  const allowedSlugs = new Set(["essencial-mensal", "essencial-anual-lancamento"]);
  const uiPlans: UiPlan[] = data ? data.filter((plan) => allowedSlugs.has(plan.slug)).map(mapPlanToUi) : [];

  return (
    <div className="min-h-screen flex flex-col items-center ">
      <header className=" bg-gradient-to-r from-primary to-secondary w-full flex items-center justify-center ">
        <PageHeader title="Planos da Flynance" showBack />
      </header>
      <section className="flex flex-col gap-16 pb-16">
        {/* HERO */}
        <div className="text-center px-4 pt-8">
          <h1 className="text-4xl font-semibold text-primary">
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
          <div className="flex flex-col md:flex-row justify-center gap-10 px-6  w-full max-w-5xl">
            {uiPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} revalidateSubscription/>
            ))}

          </div>
        )}
        <PlansFaq />
      </section>
    </div>
  );
}
