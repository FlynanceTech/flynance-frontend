// src/app/cadastro/checkout/page.tsx

import { Suspense } from "react";
import { CheckoutPageClient } from "./client";


// 👇 Server Component (NÃO tem "use client")
export default function CheckoutPage() {
  return (
    <div className="bg-slate-100 flex flex-col">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-500">Carregando checkout...</p>
          </div>
        }
      >
        <CheckoutPageClient />
      </Suspense>
    </div>
  );
}
