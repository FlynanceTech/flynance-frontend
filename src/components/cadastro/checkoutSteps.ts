// components/cadastro/checkoutSteps.ts
export const CHECKOUT_STEPS = [
  "Informacoes do cliente",
  "Pagamento",
  "Finalizacao",
] as const;

export type CheckoutStepIndex = 0 | 1 | 2; // opcional, mas ajuda na tipagem
