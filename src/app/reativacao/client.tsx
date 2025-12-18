'use client'

import React, { useEffect } from "react";
import { CHECKOUT_STEPS } from "@/components/cadastro/checkoutSteps";
import { usePlanBySlug } from "@/hooks/query/usePlan";
import { useRouter, useSearchParams } from "next/navigation";
import CheckoutStepper from "@/components/planos/checkout";
import ReactivationHeader from "@/components/cadastro/ReactivationHeader";

// --- helpers de decode do token curto ---

// mapa do código -> slug do plano
const PLAN_SLUG_FROM_CODE: Record<string, string> = {
  e: "essencial-mensal",
  a: "essencial-anual",
  // adicionar outros aqui se criar mais códigos
}

// converte base64url (sem padding) -> uuid
function base64UrlToUuid(b64url: string): string {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = base64.length % 4
  const padded = base64 + (pad ? "=".repeat(4 - pad) : "")

  const binary = atob(padded)
  let hex = ""

  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, "0")
  }

  return (
    hex.slice(0, 8) + "-" +
    hex.slice(8, 12) + "-" +
    hex.slice(12, 16) + "-" +
    hex.slice(16, 20) + "-" +
    hex.slice(20)
  )
}

export function CheckoutPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1) lê token curto
  const token = searchParams.get("t");

  // 2) também lê formato antigo (fallback)
  const fallbackPlan = searchParams.get("plano") ?? undefined;
  const fallbackUserId = searchParams.get("userId") ?? undefined;

  // 3) resolve plano + userId a partir do token ou dos params antigos
  let plano: string | undefined = fallbackPlan;
  let userId: string | undefined = fallbackUserId;

  if(!userId){
    router.push(`/cadastro/checkout?plano=${plano}`);
  }

  if (token && token.length > 1) {
    try {
      const code = token[0];
      const compact = token.slice(1);

      const slug = PLAN_SLUG_FROM_CODE[code];
      if (slug) {
        plano = slug;
        userId = base64UrlToUuid(compact);
      } else {
        console.error("Código de plano inválido no token:", code);
      }
    } catch (err) {
      console.error("Erro ao decodificar token de reativação:", err);
    }
  }

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
      <div className="flex items-center justify-center py-10 h-screen flex-1">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Carregando plano...</p>
      </div>
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
          Plano não encontrado. Verifique o link ou volte para a página de planos.
        </p>
      </div>
    );
  }

  return (
    <>
      <ReactivationHeader step={step} />

      <main>
        <div className="max-w-6xl mx-auto px-4 lg:px-0 -mt-16 pb-16">
          <section className="relative z-20">
            <CheckoutStepper
              plan={data}
              step={step}
              userId={userId || ""}
              onStepChange={handleStepChange}
            />
          </section>
        </div>
      </main>
    </>
  );
}
