import { PlansResponse } from "@/types/plan";
import { UiPlan } from "./plancard";

const DEFAULT_BENEFITS = [
  "Gastos categorizados automaticamente",
  "Metas mensais com alertas inteligentes",
  "Relatórios completos e projeções financeiras",
  "Dashboard avançado e em tempo real",
];

export function mapPlanToUi(plan: PlansResponse): UiPlan {
  const slug = plan.slug?.toLowerCase() ?? "";
  const isYearly = plan.period === "YEARLY" || slug.includes("anual");

  // preÃ§o base em reais
  const yearlyTotalCents = 19104;
  const safeCents = isYearly ? Math.max(plan.priceCents, yearlyTotalCents) : plan.priceCents;
  const baseValue = safeCents / 100;

  // no anual vocÃª quer mostrar o valor mensal equivalente
  const monthlyValue = isYearly ? baseValue / 12 : baseValue;

  const formattedPrice = monthlyValue.toFixed(2).replace(".", ",");

  const trialDays = plan.trialDays ?? 7;
  const trialLabel = `Teste gratuitamente por ${trialDays} dias`;

  const baseBenefits =
    plan.features && plan.features.length > 0
      ? plan.features.map((f) => f.label)
      : DEFAULT_BENEFITS;

  const benefits = [
    trialLabel,
    ...baseBenefits.filter(
      (item) =>
        !/teste gratuitament/i.test(item) &&
        !/30 dias gr(a|Ã¡)tis/i.test(item) &&
        !/30 dias/i.test(item)
    ),
  ];

  return {
    id: plan.id,
    slug: plan.slug,
    title: isYearly ? "12 meses" : "1 mês",
    price: formattedPrice,
    priceSuffix: isYearly ? "x 12" : "/ mês",
    previousPrice: isYearly ? "19,90" : undefined,
    priceNote: isYearly ? "R$ 191,04 à vista" : undefined,
    badge: isYearly ? "20% OFF" : "Popular",
    badgeType: isYearly ? "discount" : "primary",
    applyDiscount: !isYearly,
    ctaLabel: isYearly ? "Garanta já 20% OFF" : "Testar Gratuitamente",
    benefits,
  };
}
