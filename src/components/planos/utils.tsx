import { PlansResponse } from "@/types/plan";
import { UiPlan } from "./plancard";

const DEFAULT_BENEFITS = [
  "Gastos categorizados automaticamente",
  "Metas mensais com alertas inteligentes",
  "Relatórios completos e projeções financeiras",
  "Dashboard avançado e em tempo real",
];

export function mapPlanToUi(plan: PlansResponse): UiPlan {
  const isYearly = plan.period === "YEARLY";

  // preço base em reais
  const baseValue = plan.priceCents / 100;

  // no anual você quer mostrar o valor mensal equivalente
  const monthlyValue = isYearly ? baseValue / 12 : baseValue;

  const formattedPrice = monthlyValue
    .toFixed(2)
    .replace(".", ",");

  return {
    id: plan.id,
    slug: plan.slug,
    title: isYearly ? "12 meses" : "1 mês",
    price: formattedPrice,
    priceSuffix: "/ mês",
    previousPrice: isYearly ? "19,90" : undefined, // opcional: você pode puxar isso do backend depois
    badge: isYearly ? "10% OFF" : "Popular",
    badgeType: isYearly ? "discount" : "primary",
    ctaLabel: isYearly ? "Garanta já 10% OFF" : "Testar Gratuitamente",
    benefits:
      plan.features && plan.features.length > 0
        ? plan.features.map((f) => f.label)
        : DEFAULT_BENEFITS,
  };
}