'use client'

import clsx from "clsx";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  revalidateSubscription?: boolean;
};

function parseBRLToNumber(value: string) {
  const cleaned = (value ?? "").toString().trim().replace(/[^\d.,-]/g, "");
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.includes(",")
        ? cleaned.replace(",", ".")
        : cleaned;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatNumberToBRLString(n: number) {
  const fixed = (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
  return fixed.replace(".", ",");
}

function splitPrice(priceBR: string) {
  const normalized = priceBR.replace(/[^\d,.-]/g, "").replace(",", ".");
  const [intPartRaw, decPartRaw] = normalized.split(".");
  const intPart = intPartRaw || "0";
  const decPart = (decPartRaw || "00").padEnd(2, "0").slice(0, 2);
  return { intPart, decPart };
}

export function PlanCard({ plan, revalidateSubscription = false }: Props) {
  const pathname = usePathname();

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

  const isDiscount = badgeType === "discount";

  const basePriceNum = parseBRLToNumber(price);
  const basePriceStr = formatNumberToBRLString(basePriceNum);

  const promoPriceNum = basePriceNum * 0.9;
  const promoPriceStr = formatNumberToBRLString(promoPriceNum);

  const previousStrFromProps = previousPrice
    ? formatNumberToBRLString(parseBRLToNumber(previousPrice))
    : undefined;

  const displayPrice = isDiscount ? promoPriceStr : basePriceStr;
  const displayPreviousPrice = isDiscount
    ? (previousStrFromProps ?? basePriceStr)
    : previousStrFromProps;

  const { intPart, decPart } = splitPrice(displayPrice);

  const pathRedirect = revalidateSubscription
    ? `/reativacao?plano=${slug}&revalidate=${revalidateSubscription}`
    : `/cadastro/checkout?plano=${slug}`;

  // ✅ Winback: CTA condizente com "recuperar assinatura"
  const isWinbackPlansRoute = pathname === "/WinbackPage/planos";

  const winbackCtaLabel =
    slug === "mensal"
      ? "Reativar mensal"
      : slug === "anual"
        ? "Reativar anual"
        : "Reativar assinatura";

  const finalCtaLabel = isWinbackPlansRoute ? winbackCtaLabel : ctaLabel;

  return (
    <div className={clsx("flex flex-col cursor-default hover:scale-105 transition-all", isDiscount ? "" : "")}>
      <div
        className={clsx(
          "flex flex-col rounded-xl overflow-hidden w-full h-full mx-auto shadow-2xl",
          isDiscount ? "bg-gradient-to-t from-white to-white shadow-2xl" : "bg-primary shadow-2xl",
        )}
      >
        <div className={clsx("h-full p-8 flex flex-col gap-8", isDiscount ? "bg-primary" : "bg-white")}>
          {badge && (
            <div
              className={clsx(
                "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold text-white",
                isDiscount ? "bg-red-400" : "bg-primary",
              )}
            >
              {badge}
            </div>
          )}

          <div className="flex flex-col gap-4 text-center">
            <div className={clsx("flex items-center", displayPreviousPrice ? "justify-between" : "justify-center")}>
              {displayPreviousPrice && (
                <p className="text-sm text-gray-100 line-through">
                  De <span className="font-semibold">R$ {displayPreviousPrice}</span> por
                </p>
              )}

              <h2 className={clsx("text-sm font-semibold tracking-wide", isDiscount ? "text-slate-50" : "text-slate-700")}>
                {title.toUpperCase()}
              </h2>
            </div>

            <div className="space-y-1">
              <div className="flex items-end justify-center gap-1">
                <span className={clsx("text-xl font-medium", isDiscount ? "text-slate-50" : "text-slate-500")}>R$</span>

                <span className={clsx("text-8xl font-extrabold leading-none", isDiscount ? "text-white" : "text-primary")}>
                  {intPart}
                </span>

                <div className="flex flex-col">
                  <span className={clsx("text-4xl font-bold leading-none self-start mb-4", isDiscount ? "text-white" : "text-primary")}>
                    ,{decPart}
                  </span>

                  <span className={clsx("text-lg font-medium", isDiscount ? "text-slate-50" : "text-slate-500")}>
                    {priceSuffix}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left">
              <p className={clsx("text-lg font-semibold tracking-wide mb-4", isDiscount ? "text-slate-50" : "text-slate-700")}>
                Benefícios
              </p>

              <ul className={clsx("space-y-1.5 text-base", isDiscount ? "text-slate-50" : "text-primary")}>
                {benefits.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className={clsx("w-4 h-4", isDiscount ? "text-green-400" : "text-primary")} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link
            href={pathRedirect}
            className={clsx(
              "block text-center py-3 text-sm md:text-xl font-semibold rounded-full",
              isDiscount ? "bg-white text-primary shadow-2xl" : "bg-primary text-white shadow-2xl",
            )}
          >
            {finalCtaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
