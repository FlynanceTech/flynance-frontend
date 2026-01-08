// src/app/cadastro/checkout/page.tsx

import { Suspense } from "react";
import { CheckoutPageClient } from "./client";

function CheckoutFallback() {
  return (
    <div className="min-h-[70vh] w-full">
      {/* topo / stepper */}
      <div className="bg-primary/10 border-b border-slate-200">
        <div className="mx-auto w-[min(1100px,92vw)] py-6">
          <div className="h-5 w-56 rounded bg-slate-200/70 animate-pulse" />

          <div className="mt-5 grid grid-cols-3 gap-3">
            {["Informações", "Pagamento", "Finalização"].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                  <div className="mt-2 h-3 w-16 rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Preparando seu checkout com segurança…
          </p>
        </div>
      </div>

      {/* corpo */}
      <div className="mx-auto w-[min(1100px,92vw)] py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* coluna esquerda (form) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
              <div className="h-5 w-60 rounded bg-slate-200 animate-pulse" />
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
              <div className="mt-4 h-4 w-52 rounded bg-slate-100 animate-pulse" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
              <div className="h-5 w-44 rounded bg-slate-200 animate-pulse" />
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-11 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-11 rounded-lg bg-slate-100 animate-pulse" />
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 h-11 rounded-lg bg-slate-100 animate-pulse" />
                <div className="md:col-span-1 h-11 rounded-lg bg-slate-100 animate-pulse" />
                <div className="md:col-span-1 h-11 rounded-lg bg-slate-100 animate-pulse" />
              </div>

              {/* botão fake */}
              <div className="mt-6 flex justify-end">
                <div className="h-11 w-44 rounded-lg bg-primary/30 animate-pulse" />
              </div>
            </div>
          </div>

          {/* coluna direita (resumo do plano) */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
            <div className="flex">
              <div className="h-10 w-1/2 bg-primary/30 animate-pulse" />
              <div className="h-10 w-1/2 bg-slate-100 animate-pulse" />
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
              </div>

              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-3 w-[90%] rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>

            <div className="px-5 py-4 bg-primary/30 flex items-center justify-between">
              <div className="h-5 w-16 rounded bg-white/40 animate-pulse" />
              <div className="h-6 w-28 rounded bg-white/40 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 👇 Server Component (NÃO tem "use client")
export default function CheckoutPage() {
  return (
    <div className="bg-slate-100 flex flex-col">
      <Suspense fallback={<CheckoutFallback />}>
        <CheckoutPageClient />
      </Suspense>
    </div>
  );
}
