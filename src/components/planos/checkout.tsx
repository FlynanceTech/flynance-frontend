"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle } from "lucide-react";
import { CleaveInput } from "../../components/ui/input";
import { usePaymentMutations } from "@/hooks/query/usePayment";
import { ClientData, CreatePaymentPayload } from "@/types/payment";
import axios from "axios";
import CreditCard, { CheckoutCreditCard, CardBrand } from "../../app/dashboard/components/CreditCard"; 
import { detectCardBrand } from "@/utils/detectCardBrand";

// ---------- utils reutilizados ----------
const digits = (s: string) => s.replace(/\D/g, "");

function getPlanAmountInCents(plan: "anual" | "mensal") {
  if (plan === "anual") return Math.round(17.91 * 100); // por parcela
  return Math.round(19.9 * 100); // mensal
}

function splitExpiry(expiry: string) {
  const [m = "", y = ""] = expiry.split("/");
  const year = y.length === 2 ? `20${y}` : y;
  return { month: m, year };
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as any).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Erro inesperado.";
}

function mapToCardBrand(raw: string | null): CardBrand {
  if (!raw) return "OTHER";
  const normalized = raw.toUpperCase();

  if (normalized.includes("VISA")) return "VISA";
  if (normalized.includes("MASTER")) return "MASTERCARD";
  if (normalized.includes("ELO")) return "ELO";
  if (normalized.includes("AMEX")) return "AMEX";
  if (normalized.includes("HIPER")) return "HIPERCARD";

  return "OTHER";
}

type PlanPaymentProps = {
  selectedPlan: "anual" | "mensal";
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  onSuccess?: () => void; // opcional: redirecionar, fechar modal, etc.
};

// ---------- componente principal ----------
export function PlanPayment({ selectedPlan, user, onSuccess }: PlanPaymentProps) {
  const { createCustomerMutation, createPaymentMutation } =
    usePaymentMutations();

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardBrand, setCardBrand] = useState<CardBrand>("OTHER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputClasses =
    "p-3 border border-gray-300 rounded-md w-full focus:outline focus:outline-2 focus:outline-green-500 focus:outline-offset-2";

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!cardNumber || !cardName || !expiry || !cvv) {
        setLoading(false);
        setError(
          "Preencha os dados do cartão (número, nome, validade e CVV)."
        );
        return;
      }

      // 1) criar customer no gateway
      const customerPayload: ClientData = {
        name: user.name,
        email: user.email,
        mobilePhone: digits(user.phone),
        externalReference: user.id,
      };

      const customer = await createCustomerMutation.mutateAsync(
        customerPayload
      );

      // 2) cobrar no cartão
      const { month, year } = splitExpiry(expiry);
      const amountInCents = getPlanAmountInCents(selectedPlan);

      const paymentPayload: CreatePaymentPayload = {
        customerId: customer.id,
        paymentDetails: {
          amount: amountInCents / 100, // se a API espera em reais
          description: `Assinatura Flynance - ${selectedPlan}`,
          creditCard: {
            holderName: cardName,
            number: digits(cardNumber),
            expiryMonth: month,
            expiryYear: year,
            ccv: digits(cvv),
          },
        },
      };

      const paymentRes = await createPaymentMutation.mutateAsync(
        paymentPayload
      );
      console.log("payment", paymentRes);

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(getErrorMessage(message));
      } else {
        console.error(err);
        setError("Ocorreu um erro inesperado ao processar o pagamento.");
      }
    } finally {
      setLoading(false);
    }
  };

  const valorTexto =
    selectedPlan === "anual"
      ? "12x R$ 17,91 (cobrança anual R$ 214,92)"
      : "R$ 19,90 / mês";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* sucesso */}
      {success && (
        <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 rounded flex items-center gap-2 text-sm">
          <CheckCircle className="w-5 h-5" />
          Assinatura ativada com sucesso! Seu pagamento foi aprovado. 🎉
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* layout: cartão + formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)] gap-6">
        {/* Cartão visual */}
        <div className="flex items-center justify-center">
          <CheckoutCreditCard
            name={cardName}
            brand={cardBrand}
            number={cardNumber}
            expiry={expiry}
            className="max-w-xs w-full"
          />
        </div>

        {/* Formulário */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-[#333C4D]">
            {/* <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CreditCard className="w-5 h-5" />
            </span> */}
            Pagamento com cartão
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CleaveInput
              name="cardNumber"
              placeholder="Número do cartão"
              options={{ creditCard: true }}
              className={`${inputClasses} col-span-2`}
              value={cardNumber}
              onChange={(e) => {
                const value = e.target.value;
                setCardNumber(value);
                const detected = detectCardBrand(value); // ex: 'visa'
                setCardBrand(mapToCardBrand(detected));
              }}
            />
            <div className="flex gap-4 ">
              <CleaveInput
                name="expiry"
                placeholder="MM/AA"
                options={{ date: true, datePattern: ["m", "y"] }}
                className={inputClasses}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
              <CleaveInput
                name="cvv"
                placeholder="CVV"
                options={{ blocks: [3], numericOnly: true }}
                className={inputClasses}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
              />
            </div>
          </div>

          <input
            name="cardName"
            placeholder="Nome impresso no cartão"
            className={inputClasses}
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
        </div>
      </div>

      {/* resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-200 mt-4">
        <div className="flex flex-col gap-2 text-sm">
          <h3 className="text-base font-semibold text-[#333C4D] mb-1">
            Resumo da assinatura
          </h3>
          <p>
            <strong>Plano:</strong> Flynance {selectedPlan}
          </p>
          <p>
            <strong>Valor:</strong> {valorTexto}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <h3 className="text-base font-semibold text-[#333C4D] mb-1">
            Informações do cliente
          </h3>
          <p>
            <strong>Cliente:</strong> {user.name}
          </p>
          <p>
            <strong>E-mail:</strong> {user.email}
          </p>
          <p>
            <strong>WhatsApp:</strong> {user.phone}
          </p>
        </div>
      </div>

      <button
        disabled={loading || success}
        onClick={handleSubmit}
        className={clsx(
          "mt-2 px-6 py-3 rounded-md font-medium cursor-pointer self-end",
          loading || success
            ? "bg-gray-300 text-gray-600"
            : "bg-primary text-white hover:opacity-90"
        )}
      >
        {loading ? "Processando..." : success ? "Pagamento aprovado" : "Confirmar pagamento"}
      </button>
    </div>
  );
}
