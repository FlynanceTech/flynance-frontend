export type PlanId = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  title: string;
  price: string;        // "19,90"
  priceSuffix: string;  // "/ mês"
  previousPrice?: string;
  badge?: string;
  badgeType?: "primary" | "discount";
  ctaLabel: string;
  benefits: string[];
};

export const PLANS: Plan[] = [
  {
    id: "monthly",
    title: "1 mês",
    price: "19,90",
    priceSuffix: "/ mês",
    badge: "Popular",
    badgeType: "primary",
    ctaLabel: "Comece agora",
    benefits: [
      "Teste gratuitamente por 7 dias",
      "Registro de gastos e receitas",
      "Categorias ilimitadas",
      "Acesso ao Dashboard financeiro",
      "Mensagens de relatório pela Fly",
    ],
  },
  {
    id: "yearly",
    title: "12 meses",
    price: "17,91",
    priceSuffix: "/ mês",
    previousPrice: "19,90",
    badge: "10% OFF",
    badgeType: "discount",
    ctaLabel: "Garanta já 10% OFF",
    benefits: [
      "Teste gratuitamente por 7 dias",
      "Registro de gastos e receitas",
      "Categorias ilimitadas",
      "Acesso ao Dashboard financeiro",
      "Acesso à plataforma de educação",
      "Mensagens de relatório pela Fly",
    ],
  },
];
