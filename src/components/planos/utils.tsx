import { PlansResponse } from "@/types/plan";
import { UiPlan } from "./plancard";

const DEFAULT_BENEFITS = [
  "Gastos categorizados automaticamente",
  "Metas mensais com alertas inteligentes",
  "Relatorios completos e projecoes financeiras",
  "Dashboard avancado e em tempo real",
];

const COUPLE_EXTRA_BENEFITS = [
  "Tudo do plano mensal",
  "2 acessos no mesmo plano",
  "Convite para adicionar parceiro(a)",
  "Dashboard compartilhado do casal",
  "Visao consolidada das financas da casa",
  "Acompanhamento financeiro em conjunto",
];

function normalizePlanText(plan: PlansResponse): string {
  return [
    plan.slug,
    plan.name,
    plan.description,
    ...(Array.isArray(plan.features)
      ? plan.features.flatMap((feature) => [feature.label, feature.key, feature.value])
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isCouplePlan(plan: PlansResponse) {
  const text = normalizePlanText(plan);

  return [
    /\bcasal\b/,
    /\bcouple\b/,
    /\bduo\b/,
    /\bpartner\b/,
    /\bcompartilh/,
    /\bshared\b/,
    /\bhouse\b/,
    /\b2\s*(usuarios|pessoas|people|members)\b/,
  ].some((pattern) => pattern.test(text));
}

export function mapPlanToUi(plan: PlansResponse): UiPlan {
  const slug = plan.slug?.toLowerCase() ?? "";
  const isYearly = plan.period === "YEARLY" || slug.includes("anual");
  const couplePlan = isCouplePlan(plan);

  const yearlyTotalCents = 19104;
  const safeCents = isYearly ? Math.max(plan.priceCents, yearlyTotalCents) : plan.priceCents;
  const baseValue = safeCents / 100;
  const monthlyValue = isYearly ? baseValue / 12 : baseValue;
  const formattedPrice = monthlyValue.toFixed(2).replace(".", ",");

  const trialDays = plan.trialDays ?? 7;
  const trialLabel = `Teste gratuitamente por ${trialDays} dias`;

  const baseBenefits =
    plan.features && plan.features.length > 0
      ? plan.features.map((feature) => feature.label)
      : DEFAULT_BENEFITS;

  const benefits = [
    trialLabel,
    ...baseBenefits.filter(
      (item) =>
        !/teste gratuitament/i.test(item) &&
        !/30 dias gr(a|a)tis/i.test(item) &&
        !/30 dias/i.test(item)
    ),
  ];

  const extraCoupleBenefitsFromPlan = benefits.filter((item) =>
    /casal|couple|compartilh|shared|parceir|2 acessos|duo|conjunto|casa/i.test(item)
  );

  const normalizedBenefits = couplePlan
    ? [
        trialLabel,
        ...Array.from(new Set([...COUPLE_EXTRA_BENEFITS, ...extraCoupleBenefitsFromPlan])),
      ]
    : benefits;

  return {
    id: plan.id,
    slug: plan.slug,
    title: couplePlan ? (isYearly ? "Casal anual" : "Casal") : isYearly ? "12 meses" : "1 mes",
    price: formattedPrice,
    priceSuffix: isYearly ? "x 12" : "/ mes",
    previousPrice: isYearly ? "19,90" : undefined,
    priceNote: isYearly ? "R$ 191,04 a vista" : undefined,
    badge: couplePlan ? "Conta casal" : isYearly ? "20% OFF" : "Popular",
    badgeType: couplePlan ? "primary" : isYearly ? "discount" : "primary",
    applyDiscount: !isYearly,
    ctaLabel: couplePlan
      ? "Comecar em casal"
      : isYearly
        ? "Garanta ja 20% OFF"
        : "Testar Gratuitamente",
    benefits: normalizedBenefits,
  };
}
