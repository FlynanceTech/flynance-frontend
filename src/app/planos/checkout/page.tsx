'use client'
import { PlanPayment } from "@/components/planos/checkout";
import { useUserSession } from "@/stores/useUserSession";
import { ArrowLeft } from "lucide-react";
import Image from "next/image"
import { useEffect } from "react";
import logo from "../../../../assets/flynance-logo-white.png"
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutPage() {
  const { user, fetchAccount } = useUserSession();
  const router = useRouter();
    const params = useSearchParams();
    
  // flags simples
  const isYearly = params.has("yearly");

  // define o plano final
  const selectedPlan: "anual" | "mensal" =
    isYearly ? "anual" : "mensal";

    useEffect(() => {
      fetchAccount();
    }, [fetchAccount]);

  if (!user) return (
    <div>
        Usuario não encontrado
    </div>
  )

const handleBack = () => {
    router.back(); 
  };


  return (
    <div className="min-h-screen bg-gradient-to-r from-primary to-secondary ">
        <header className='bg-gradient-to-r  from-primary to-secondary text-white px-6 py-4 flex justify-center '>
        <div className="w-full max-w-4xl mx-auto px-4 flex justify-between items-center">
            <div className='flex items-center gap-2'>
            <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-sm transition cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </button>
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
      <section className="mt-12 px-4 pb-16 flex justify-center">
        <PlanPayment
          selectedPlan={selectedPlan}
          user={{
            id: user.userData.user.id,
            name: user.userData.user.name,
            email: user.userData.user.email,
            phone: user.userData.user.phone,
          }}
          onSuccess={() => {
            // ex: atualizar sessão / redirecionar
            // router.push("/dashboard");
          }}
        />
      </section>
    </div>
  );
}
