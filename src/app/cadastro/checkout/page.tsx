"use client";

import CheckoutStepper from "@/components/cadastro/checkoutStepper";
import CheckoutHeader from "@/components/cadastro/CheckoutHeader";
import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlanBySlug } from "@/hooks/query/usePlan";
import { CHECKOUT_STEPS } from "@/components/cadastro/checkoutSteps";

export default function Checkout() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const plano = searchParams.get("plano") ?? undefined;
  const { data, isLoading, error } = usePlanBySlug(plano);

  useEffect(() => {
    if (!plano) router.push("/");
  }, [plano, router]);

  const stepParam = searchParams.get("step");
  const rawStep = stepParam ? Number(stepParam) : 0;
  const step = Number.isNaN(rawStep)
    ? 0
    : Math.min(Math.max(rawStep, 0), CHECKOUT_STEPS.length - 1);

  const handleStepChange = (nextStep: number) => {
    const clamped = Math.min(
      Math.max(nextStep, 0),
      CHECKOUT_STEPS.length - 1
    );

    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(clamped));
    router.replace(`?${params.toString()}`);

    if (plano) {
      localStorage.setItem(`checkoutStep:${plano}`, String(clamped));
    }
  };

  if (!plano) return null;

  if (isLoading) {
    return (
      <div className=" flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando plano...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className=" flex items-center justify-center">
        <p className="text-sm text-red-500">
          Ocorreu um erro ao carregar o plano. Tente novamente.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className=" flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Plano não encontrado. Verifique o link ou volte para a página de planos.
        </p>
      </div>
    );
  }

  return (
    <div className=" bg-slate-100 flex flex-col">
      {/* faixa azul + stepper */}
      <CheckoutHeader step={step} />

      {/* área de conteúdo com sobreposição */}
      <main className="">
        <div className="max-w-6xl mx-auto px-4 lg:px-0 -mt-16 pb-16">
          <section
            className="
              relative z-20
        
            "
          >
            <Suspense
              fallback={
                <div className="text-center text-sm text-gray-500">
                  Carregando checkout...
                </div>
              }
            >
              <CheckoutStepper
                plan={data}
                step={step}
                onStepChange={handleStepChange}
              />
            </Suspense>
          </section>
        </div>
      </main>
    </div>
  );
}
