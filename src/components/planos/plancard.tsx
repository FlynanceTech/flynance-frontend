'use client'

import clsx from "clsx";
import { Check } from "lucide-react";
import Link from "next/link";

type BadgeType = "primary" | "discount" | undefined;

export type UiPlan = {
  id: string;
  slug: string;
  title: string;
  price: string;        // ex: "19,90" ou "17,91"
  priceSuffix: string;  // ex: "/Mês" ou "/x12"
  previousPrice?: string;
  badge?: string;
  badgeType?: BadgeType;
  ctaLabel: string;
  benefits: string[];
};

type Props = {
  plan: UiPlan;
  revalidateSubscription?: boolean
};

export function PlanCard({ plan, revalidateSubscription = false }: Props) {
  const {
    slug,
    title,
    price,
    priceSuffix,
    previousPrice,
    badge,
    badgeType,
    ctaLabel,
    benefits,
  } = plan;

  const isDiscount = badgeType === "discount"; // Anual (10% OFF)

  function splitPrice(price: string) {
    const normalized = price
      .replace(/[^\d,.-]/g, "")  
      .replace(",", ".");

    const [intPartRaw, decPartRaw] = normalized.split(".");
    const intPart = intPartRaw || "0";
    const decPart = (decPartRaw || "00").padEnd(2, "0").slice(0, 2);

    return { intPart, decPart };
  }
  const { intPart, decPart } = splitPrice(price);

  const pathRedirect = revalidateSubscription ?  `/reativacao?plano=${slug}&revalidate=${revalidateSubscription}` : `/cadastro/checkout?plano=${slug}`

  return (
      <div
        className={clsx("flex flex-col hover:scale-105 transition-all", isDiscount ?  '' : '' )}
      >
      <div className={clsx(
        "  flex flex-col rounded-xl overflow-hidden w-full  h-full  mx-auto shadow-2xl",
        isDiscount ? "bg-gradient-to-t from-white to-white shadow-2xl" : " bg-primary shadow-2xl",
      )}>
        <div className={clsx(" h-full p-8 flex flex-col gap-8", 
          isDiscount ? "bg-primary" : "bg-white"
        )}>

          {badge && (
            <div
              className={clsx(
                "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold text-white ",
                isDiscount ? "bg-red-400" : "bg-primary"
              )}
                
            >
              {badge}
            </div>
          )}

          <div className="flex flex-col gap-4 text-center">
 
           <div className={clsx("flex  items-center", previousPrice ? " justify-between" : " justify-center")}>

              {previousPrice && (
                <p className="text-sm text-gray-100 line-through">
                  De {previousPrice} por
                </p>
              )}
              <h2
                className={ clsx("text-sm font-semibold tracking-wide", isDiscount ? "text-slate-50" : "text-slate-700")}
              >
                {title.toUpperCase()}
              </h2>
            </div> 
            <div className="space-y-1">

              <div className="flex items-end justify-center gap-1">
                <span
                  className={ clsx("text-xl font-medium ", isDiscount ? "text-slate-50" : "text-slate-500")}
                >
                  R$
                </span>

                 <span
                    className={clsx(
                      "text-8xl font-extrabold leading-none ",
                      "bg-gradient-to-b bg-clip-text ",
                      isDiscount
                        ? "text-white"
                        : "text-primary"
                    )}
                  >
                    {intPart}
                  </span>
                  <div className="flex flex-col">
                    <span
                      className={clsx(
                        "text-4xl font-bold leading-none self-start mb-4",
                        isDiscount ? "text-white" : "text-primary"
                      )}
                    >
                      ,{decPart}
                    </span>

                  <span className={
                    clsx("text-lg font-medium ", isDiscount ? "text-slate-50" : "text-slate-500")
                  }>
                    {priceSuffix}
                  </span>
                  </div>

              </div>
            </div>
            
            <div className="text-left">
              <p 
                className={ clsx("text-lg font-semibold tracking-wide mb-4", isDiscount ? "text-slate-50" : "text-slate-700")}>
                Benefícios
              </p>
              <ul className={clsx("space-y-1.5 text-base ", isDiscount ? "text-slate-50"  : "text-primary")}>
                {benefits.map((item) => (
                  <li key={item} className="flex items-center gap-2 ">
                    <Check
                      className={clsx("w-4 h-4", isDiscount ? "text-green-400" : "text-primary")}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
        </div>
          <Link
            href={pathRedirect} 
              className={clsx(
                "block text-center py-3 text-sm md:text-xl font-semibold  rounded-full",
                isDiscount ? 
                  "bg-white text-primary shadow-2xl" : "bg-primary text-white shadow-2xl",
              )
            }
          >
            {ctaLabel}
          </Link>
        </div>
                
      </div>
   
    </div>
  );
}
