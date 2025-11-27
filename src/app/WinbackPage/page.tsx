"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WinbackPage() {

  const previousPlan = {
    name: "Essencial – Mensal",
    price: "R$ 19,90/mês",
    cancelledAt: "12/11/2025",
  };

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
          <h1 className="text-4xl font-bold mb-4">
            Continue sua jornada financeira.
          </h1>
          <p className="text-lg opacity-90 mb-8 text-center">
            Sua assinatura foi encerrada, mas seus dados continuam <br /> seguros
            e prontos para você retomar de onde parou.
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
      <section className="w-full h-full lg:py-8 flex flex-col gap-8 items-center justify-center z-30 lg:mt-0 ">
        <div className="flex flex-col gap-6 items-center justify-center w-full h-full bg-white rounded-t-[48px] lg:rounded-[64px] px-6">
          <h2 className="text-2xl font-semibold mt-4">
            Sentimos sua falta! 
          </h2>

          <p className="text-gray-600 text-center">
            Reative sua assinatura e continue transformando sua vida <br />{" "}
            financeira com os recursos premium da Flynance.
          </p>

          {/* Plano anterior */}
          <div className="mb-2 border border-gray-200 rounded-lg p-4 text-left w-full max-w-md">
            <p className="text-sm font-medium text-gray-700">
              Seu plano anterior
            </p>
            <p className="mt-1 text-gray-900 font-semibold">
              {previousPlan.name}
            </p>
            <p className="text-sm text-gray-600">
              {previousPlan.price} • Cancelado em {previousPlan.cancelledAt}
            </p>
            <p className="mt-2 text-xs text-emerald-700">
              Ao reativar, você continuará neste mesmo plano.
            </p>
          </div>

          {/* Mensagem de sucesso simulada */}
        {/*   {isReactivated && (
            <div className="w-full max-w-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md px-4 py-3">
              Assinatura reativada com sucesso! Redirecionando para o painel
              em instantes… 🚀
            </div>
          )}
 */}
          {/* <Button
            className="max-w-80 w-full h-12 text-lg mb-1"
            onClick={handleReactivate}
            disabled={isLoading || isReactivated}
          >
            {isLoading
              ? "Reativando..."
              : isReactivated
              ? "Reativado"
              : "Reativar assinatura"}
          </Button> */}

          <Link
            href="/planos"
            className="text-primary text-center mt-1 hover:underline mb-4"
          >
             <Button
            className="max-w-80 w-full h-12 text-lg mb-1"
          >

            Ver planos novamente
          </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
