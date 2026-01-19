"use client";

import { Button } from "@/components/ui/button";
import { useSignature } from "@/hooks/query/useSignature";
import { useUserSession } from "@/stores/useUserSession";
import Link from "next/link";
import { useEffect, useMemo } from "react";

function formatBRL(value?: number | null) {
  if (value == null) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateBR(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

function cycleLabel(cycle?: string | null) {
  if (cycle === "YEARLY") return "/ano";
  return "/mês";
}

function CardSkeleton() {
  return (
    <div className="mb-2 border border-gray-200 rounded-lg p-4 text-left w-full max-w-md animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
      <div className="h-5 w-56 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-64 bg-gray-200 rounded" />
    </div>
  );
}

export default function WinbackPage() {
  const { user, fetchAccount } = useUserSession();

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const userId = user?.userData?.user?.id;

  // ✅ query só dispara quando userId existir (assumindo que seu hook usa enabled: !!userId)
  const { useSignatureByUserId } = useSignature(userId);
  const { data, isLoading, isError, isFetching } = useSignatureByUserId;

  // ✅ FIX: protege data/lastSubscription pra não quebrar em build/primeiro render
  const signature = data?.lastSubscription?.signature ?? null;
  const stripeSubscription = data?.lastSubscription?.stripeSubscription ?? null;

  // (opcional) evita poluir log em produção
  // if (process.env.NODE_ENV !== "production") {
  //   console.log("check signature", signature);
  //   console.log("check stripeSubscription", stripeSubscription);
  // }

  const previousPlan = useMemo(() => {
    if (!signature) return null;

    const name = signature?.plan?.name ?? signature?.description ?? "Plano anterior";
    const price = `${formatBRL(signature?.value)}${cycleLabel(signature?.cycle)}`;
    const cancelledAt = formatDateBR(signature?.endDate ?? signature?.updatedAt);

    // helper default
    let helper = "Ao reativar, você continuará neste mesmo plano.";

    if (stripeSubscription?.status === "trialing" && stripeSubscription?.trial_end) {
      helper = `Período de teste até ${formatDateBR(
        new Date(stripeSubscription.trial_end * 1000).toISOString()
      )}.`;
    }

    if ((signature as any)?.cancelAtPeriodEnd) {
      helper = "Ao reativar, você mantém o acesso até o fim do ciclo atual.";
    }

    return { name, price, cancelledAt, helper };
  }, [signature, stripeSubscription]);

  return (
    <main
      className="
        w-screen h-screen flex flex-col 
        bg-gradient-to-r from-primary to-secondary
        lg:bg-none lg:bg-secondary
        lg:grid lg:grid-cols-2 lg:pr-8
      "
    >
      {/* LEFT */}
      <section className="relative w-full h-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center px-8">
        <div className="flex flex-col items-center z-20 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Continue sua jornada financeira.</h1>
          <p className="text-lg opacity-90 mb-8 text-center">
            Sua assinatura foi encerrada, mas seus dados continuam <br /> seguros e prontos
            para você retomar de onde parou.
          </p>

          <ul className="space-y-3 text-lg opacity-95 text-start">
            <li>✔ Gastos categorizados automaticamente</li>
            <li>✔ Metas mensais com alertas inteligentes</li>
            <li>✔ Relatórios completos e projeções financeiras</li>
            <li>✔ Dashboard avançado e em tempo real</li>
          </ul>
        </div>
      </section>

      {/* RIGHT */}
      <section className="w-full h-full lg:py-8 flex flex-col gap-8 items-center justify-center z-30 lg:mt-0">
        <div className="flex flex-col gap-6 items-center justify-center w-full h-full bg-white rounded-t-[48px] lg:rounded-[64px] px-6">
          <h2 className="text-2xl font-semibold mt-4">Sentimos sua falta!</h2>

          <p className="text-gray-600 text-center">
            Reative sua assinatura e continue transformando sua vida <br /> financeira com os
            recursos premium da Flynance.
          </p>

          {/* ✅ Loading (inclui isFetching para refetch) */}
          {(isLoading || isFetching) && <CardSkeleton />}

          {/* ✅ Error */}
          {isError && (
            <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Não conseguimos carregar seu plano anterior agora. Você ainda pode ver os planos.
            </div>
          )}

          {/* ✅ Só renderiza quando tiver dados */}
          {!isLoading && !isFetching && previousPlan && (
            <div className="mb-2 border border-gray-200 rounded-lg p-4 text-left w-full max-w-md">
              <p className="text-sm font-medium text-gray-700">Seu plano anterior</p>

              <p className="mt-1 text-gray-900 font-semibold">{previousPlan.name}</p>

              <p className="text-sm text-gray-600">
                {previousPlan.price} • Cancelado em {previousPlan.cancelledAt}
              </p>

              <p className="mt-2 text-xs text-emerald-700">{previousPlan.helper}</p>
            </div>
          )}

          {/* ✅ Caso não tenha assinatura (ex: usuário nunca assinou) */}
          {!isLoading && !isFetching && !isError && !previousPlan && (
            <div className="mb-2 border border-gray-200 rounded-lg p-4 text-left w-full max-w-md">
              <p className="text-sm font-medium text-gray-700">Seu plano anterior</p>
              <p className="mt-1 text-gray-900 font-semibold">
                Não encontramos uma assinatura anterior.
              </p>
              <p className="text-sm text-gray-600">
                Escolha um plano para voltar a usar a Flynance.
              </p>
            </div>
          )}

          <Link
            href="/WinbackPage/planos"
            className="text-primary text-center mt-1 hover:underline mb-4"
          >
            <Button className="max-w-80 w-full h-12 text-lg mb-1">Ver planos novamente</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
