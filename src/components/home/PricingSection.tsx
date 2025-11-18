/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import Image from "next/image";
import background from "../../../assets/background-plan.svg";

import PricingCard from "./PricingCard";
import { usePlans } from "@/hooks/query/usePlan";

export default function PricingSection() {
  const { data, isLoading, error } = usePlans();
  console.log('data', data)
  return (
    <section
      id="pricing"
      className="flex relative flex-col items-center self-stretch px-8 xl:px-0 pt-16 mt-16 w-full min-h-[1010px] max-md:mt-10 max-md:max-w-full"
    >
      {/* BG */}
      <Image
        src={background}
        alt="Background"
        width={1920}
        height={1010}
        className="object-cover absolute inset-0 size-full"
      />

      <div className="flex relative z-10 flex-col w-full md:max-w-[1280px] gap-8 items-center justify-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center px-4">
          Escolha seu plano e comece a economizar
        </h2>

        {/* LOADING */}
        {isLoading && (
          <div className="text-white text-lg mt-10">Carregando planos...</div>
        )}

        {/* ERROR */}
        {error && (
          <div className="text-red-300 font-medium mt-10">
            Não foi possível carregar os planos.
          </div>
        )}

        {/* LISTA DE PLANOS */}
        {!isLoading && data && (
          <div className="w-full flex flex-col md:flex-row gap-8 items-center justify-center">
            {data.map((plan: any) => {
              const price = (plan.priceCents / 100).toFixed(2); // R$ xx,xx
              const [intPart, decimalPart] = price.split(".");

              return (
                <PricingCard
                  key={plan.id}
                  popular={plan.slug === "mensal"} // deixa o mensal como "popular"
                  discount={plan.slug === "anual" ? "10% Off" : undefined}
                  planType={plan.slug}
                  title={plan.name}
                  price={
                    <div className="flex justify-center items-center self-center text-blue-400">
                      <div className="text-4xl font-bold flex">
                        <span className="text-xl mr-1">R$</span>
                        <span className="text-8xl">{intPart}</span>
                      </div>
                      <div className="ml-1 text-xl">
                        <div className="font-bold">,{decimalPart}</div>
                        <div className="mt-2 font-light">/ Mês</div>
                      </div>
                    </div>
                  }
                  buttonStyle={plan.slug === "mensal" ? "primary" : "secondary"}
                  buttonTitle={
                    plan.slug === "anual" ? "Garanta já 10% OFF" : undefined
                  }
                  benefits={plan.features.map((f: any) => ({
                    text: f.label,
                    active: true,
                  }))}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
