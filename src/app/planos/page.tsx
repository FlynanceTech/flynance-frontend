"use client";


import { PageHeader } from "@/components/planos/PageHeader";
import { PlanCard } from "../../components/planos/plancard";
import { PLANS } from "./plans";

export default function PlanosPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center bg-gradient-to-r from-primary to-secondary"
     
    >  
    
      <PageHeader title="Planos da Flynance" showBack />
      {/* HERO */}
      <div className="text-center pt-24 pb-10 px-4">
        <h1 className="text-4xl font-semibold text-white drop-shadow">
          Escolha seu plano e comece a economizar
        </h1>
      </div>

      {/* PLANOS */}
      <div className="flex flex-col md:flex-row justify-center gap-10 px-6 pb-20">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>


    </div>
  );
}
