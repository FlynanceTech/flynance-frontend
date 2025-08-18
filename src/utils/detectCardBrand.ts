export function detectCardBrand(cardNumber: string): string | null {
    const cleaned = cardNumber.replace(/\D/g, ""); // Remove tudo que não é número
    if (/^4/.test(cleaned)) return "visa";
    if (/^5[1-5]/.test(cleaned)) return "mastercard";
    if (/^(5019|5067|4576|4011)/.test(cleaned)) return "elo";
    if (/^3[47]/.test(cleaned)) return "amex";
    if (/^6(?:011|5)/.test(cleaned)) return "discover";
    if (/^(38|60)/.test(cleaned)) return "hipercard";
    return null;
  }
  