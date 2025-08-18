export const paymentKeys = {
    customers: ["payment", "clients"] as const,
    customer: (id: string) => ["payment", "client", id] as const,
    customerPayments: (id: string) => ["payment", "client", id, "payments"] as const,
    payment: (id: string) => ["payment", "payment", id] as const, // se vier a usar
  };
  