// components/cadastro/checkoutSteps.ts
export const CHECKOUT_STEPS = [
  "Informacoes do cliente",
  "Pagamento",
  "Finalizacao",
] as const;

export type CheckoutStepIndex = 0 | 1 | 2; // opcional, mas ajuda na tipagem

export const CHECKOUT_REVALIDATE_STEPS = [
  "Pagamento",
  "Finalizacao",
] as const;

export type CheckoutRevalidateStepIndex = 0 | 1 | 2; // opcional, mas ajuda na tipagem
