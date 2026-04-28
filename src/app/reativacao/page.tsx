import { Suspense } from "react";
import { CheckoutPageClient } from "./client";
import { getTranslations } from "next-intl/server";


export default async function ReactivacaoPage() {
  const t = await getTranslations('reactivationPage')

  return (
    <div className="bg-slate-100 flex flex-col">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-500">{t('loadingCheckout')}</p>
          </div>
        }
      >
        <CheckoutPageClient />
      </Suspense>
    </div>
  );
}
