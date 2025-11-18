"use client";

import CheckoutStepper from "@/components/cadastro/checkoutStepper";
import React, { Suspense, useEffect } from "react";
import { Undo2 } from "lucide-react";
import Image from "next/image";
import logo from "../../../../assets/flynance-logo-white.png";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlanBySlug } from "@/hooks/query/usePlan";

export default function Checkout() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const plano = searchParams.get("plano") ?? undefined;

  // 🔹 Hook SEMPRE é chamado, mesmo se plano for undefined
  const { data, isLoading, error } = usePlanBySlug(plano);

  // 🔹 Se não tiver plano na URL, redireciona
  useEffect(() => {
    if (!plano) {
      router.push("/");
    }
  }, [plano, router]);

  // Enquanto redireciona, não renderiza nada
  if (!plano) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando plano...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-500">
          Ocorreu um erro ao carregar o plano. Tente novamente.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Plano não encontrado. Verifique o link ou volte para a página de planos.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-gradient-to-r from-secondary to-primary text-white px-6 py-4 flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex gap-4 items-center">
              <Undo2 size={32} />
              <span className="font-semibold">Voltar</span>
            </Link>
          </div>
          <Image
            src={logo}
            className="object-contain aspect-[1.86] w-[93px]"
            alt="Flynance Logo"
            width={93}
            height={50}
          />
        </div>
      </header>

      <main>
        <Suspense
          fallback={
            <div className="text-center text-sm text-gray-500">
              Carregando checkout...
            </div>
          }
        >
          {/* Ajusta a prop conforme a API do componente */}
          <CheckoutStepper plan={data} />
        </Suspense>
      </main>
    </div>
  );
}
