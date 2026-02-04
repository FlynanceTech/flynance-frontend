// src/app/cadastro/checkout/page.tsx
'use client'
  import React, { useEffect } from "react";
import CheckoutStepper from "@/components/cadastro/checkoutStepper";
import CheckoutHeader from "@/components/cadastro/CheckoutHeader";
import { CHECKOUT_STEPS } from "@/components/cadastro/checkoutSteps";
import { usePlanBySlug } from "@/hooks/query/usePlan";
import { useRouter, useSearchParams } from "next/navigation";


export function CheckoutPageClient() {
  "use client";

  const searchParams = useSearchParams();
  const router = useRouter();

  const plano = searchParams.get("plano");

  const defaultPlano = "essencial-mensal";
  const planoSlug = plano === 'undefined' || null ? defaultPlano : plano;

  const { data, isLoading, error } = usePlanBySlug(planoSlug as string);

  useEffect(() => {
    if (!plano) router.push("/");
  }, [plano, router]);

  const stepParam = searchParams.get("step");
  const rawStep = stepParam ? Number(stepParam) : 0;
  const step = Number.isNaN(rawStep)
    ? 0
    : Math.min(Math.max(rawStep, 0), CHECKOUT_STEPS.length - 1);


  if (!plano) return null;

  if (isLoading) {
    return (
      <>
        <CheckoutHeader />
        <main>
          <div className="max-w-6xl mx-auto px-4 lg:px-0 -mt-16 pb-16">
            <section className="relative z-20">
              <CheckoutPlanSkeleton />
            </section>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-red-500">
          Ocorreu um erro ao carregar o plano. Tente novamente.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-gray-500">
          Plano não encontrado. Verifique o link ou volte para a página de
          planos.
        </p>
      </div>
    );
  }

  return (
    <>
      <CheckoutHeader />

      <main>
        <div className="max-w-6xl mx-auto px-4 lg:px-0 -mt-16 pb-16">
          <section className="relative z-20">
            <CheckoutStepper
              plan={data}
            />
          </section>
        </div>
      </main>
    </>
  );
}

function CheckoutPlanSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ESQUERDA (form) */}
      <div className="col-span-1 lg:col-span-2 flex flex-col gap-4 bg-white rounded-md shadow-[0_20px_60px_rgba(15,23,42,0.20)] border border-slate-200 p-6 md:p-8">
        {/* Informações do usuário */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
          <div className="h-7 w-64 rounded bg-slate-100 animate-pulse" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 rounded-md bg-slate-100 animate-pulse" />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="h-4 w-4 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-72 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>

        {/* Cartão de crédito */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-100 animate-pulse" />
            <div className="h-6 w-44 rounded bg-slate-100 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-11 rounded-md bg-slate-100 animate-pulse" />
            <div className="h-11 rounded-md bg-slate-100 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 h-11 rounded-md bg-slate-100 animate-pulse" />
            <div className="md:col-span-1 h-11 rounded-md bg-slate-100 animate-pulse" />
            <div className="md:col-span-1 h-11 rounded-md bg-slate-100 animate-pulse" />
          </div>
        </div>

        {/* Botão */}
        <div className="flex justify-end">
          <div className="h-11 w-44 rounded-md bg-primary/20 animate-pulse" />
        </div>
      </div>

      {/* DIREITA (resumo do plano) */}
      <div className="col-span-1">
        <div className="bg-white rounded-md shadow-md flex flex-col h-full overflow-hidden border border-slate-200">
          {/* tabs */}
          <div className="flex">
            <div className="flex-1 py-2 bg-primary/20 animate-pulse" />
            <div className="flex-1 py-2 bg-slate-100 animate-pulse" />
          </div>

          <div className="p-4 md:p-5 flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
            </div>

            {/* linhas de detalhes */}
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="h-4 w-24 rounded bg-slate-100 animate-pulse mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-3 w-[90%] rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="h-4 w-36 rounded bg-slate-100 animate-pulse mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-3 w-[70%] rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* total */}
          <div className="px-4 py-3 bg-primary h-20 text-white flex items-center justify-between">
            <div className="h-5 w-16 rounded bg-white/25 animate-pulse" />
            <div className="h-8 w-28 rounded bg-white/25 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
