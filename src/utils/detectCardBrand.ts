import { CardBrand } from "@/app/dashboard/components/CreditCard";

export function detectCardBrand(cardNumber: string | null): CardBrand {
  if (cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, "");

    if (/^4/.test(cleaned)) return "VISA";
    if (/^5[1-5]/.test(cleaned)) return "MASTERCARD";
    if (/^(5019|5067|4576|4011)/.test(cleaned)) return "ELO";
    if (/^3[47]/.test(cleaned)) return "AMEX";
    if (/^6(?:011|5)/.test(cleaned)) return "OTHER";
    if (/^(38|60)/.test(cleaned)) return "HIPERCARD";
  }

  return "OTHER"; // 🔥 nunca retorna null
}
