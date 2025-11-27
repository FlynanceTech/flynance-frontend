/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import Image from "next/image";
import background from "../../../assets/background-plan.svg";

import { usePlans } from "@/hooks/query/usePlan";
import { PlanCard, UiPlan } from "../planos/plancard";
import { mapPlanToUi } from "@/app/planos/page";

export default function PricingSection() {
  const { data, isLoading, error } = usePlans();
  
  const uiPlans: UiPlan[] = data ? data.map(mapPlanToUi) : [];

  return (
    <section
      id="pricing"
      className="flex relative flex-col items-center self-stretch px-8 xl:px-0 pt-16 mt-16 w-full min-h-[1010px] max-md:mt-10 max-md:max-w-full"
    >
      {/* BG */}
      <Image
        src={background}
        alt="Background"
        width={1920}
        height={1010}
        className="object-cover absolute inset-0 size-full"
      />

      <div className="flex relative z-10 flex-col w-full md:max-w-[1280px] gap-8 items-center justify-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center px-4">
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
          <div className="w-full flex flex-col md:flex-row gap-8 items-center justify-center">
            {uiPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
