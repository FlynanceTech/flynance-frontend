"use client";

import { Check } from "lucide-react";
import Link from "next/link";

type BadgeType = "primary" | "discount" | undefined;

export type UiPlan = {
  id: string;
  slug: string;
  title: string;
  price: string;
  priceSuffix: string;
  previousPrice?: string;
  badge?: string;
  badgeType?: BadgeType;
  ctaLabel: string;
  benefits: string[];
};

type Props = {
  plan: UiPlan;
};

export function PlanCard({ plan }: Props) {
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

  const isPrimary = badgeType === "primary";
  const isDiscount = badgeType === "discount";

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full relative">
      {badge && (
        <span
          className={[
            "absolute top-4 right-4 text-xs px-3 py-1 rounded-full",
            isPrimary && "bg-secondary text-white",
            isDiscount && "bg-secondary text-white",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {badge}
        </span>
      )}

      <h2 className="text-lg font-semibold mb-2">{title}</h2>

      {previousPrice && (
        <p className="text-sm line-through text-red-500">
          De {previousPrice} por
        </p>
      )}

      <div className="flex items-end justify-center mb-6">
        <div className="text-[42px] font-bold text-primary leading-tight">
          R$ {price}
        </div>
        <p className="text-gray-500 ml-2">{priceSuffix}</p>
      </div>

      <div
        className={`min-w-[13rem] rounded-full font-medium py-3 text-lg transition text-center ${
          isDiscount
            ? "border border-primary text-primary hover:bg-blue-50 cursor-pointer"
            : "bg-blue-500 text-white hover:bg-blue-400 cursor-pointer"
        }`}
      >
        <Link
          // você escolhe se quer passar id ou slug
          // href={`/planos/checkout?planId=${id}`}
          href={`/planos/checkout?plan=${slug}`}
        >
          {ctaLabel}
        </Link>
      </div>

      <div className="mt-8">
        <h3 className="font-semibold mb-3">Benefícios</h3>
        <ul className="space-y-3 text-gray-700">
          {benefits.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="text-primary w-5 h-5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
