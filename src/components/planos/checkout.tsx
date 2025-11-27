/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle, CreditCard } from "lucide-react";
import axios from "axios";
import { CleaveInput } from "../ui/input";
import { usePaymentMutations } from "@/hooks/query/usePayment";
import { ClientData } from "@/types/payment";
import { CheckoutCreditCard, CardBrand } from "@/app/dashboard/components/CreditCard";
import { detectCardBrand } from "@/utils/detectCardBrand";



const digits = (s: string) => s.replace(/\D/g, "");

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

type PlanPaymentProps = {
  planId: string;
  planCode: "anual" | "mensal";
  planDescription?: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpfCnpj: string;
  };
  onSuccess?: () => void;
};

type SignaturePayload = {
  userId: string;
  planId: string;
  asaasCustomerId: string;
  billingType: "CREDIT_CARD";
  cycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string;
  nextDueDate: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
  };
};

export function PlanPayment({
  planId,
  planCode,
  planDescription = "Assinatura Flynance",
  user,
  onSuccess,
}: PlanPaymentProps) {
  const { createCustomerMutation } = usePaymentMutations();

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
const [cardBrand, setCardBrand] = useState<CardBrand>("OTHER");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputClasses =
    "p-3 border border-gray-300 rounded-md w-full focus:outline focus:outline-2 focus:outline-secondary focus:outline-offset-2";

  const cycle: SignaturePayload["cycle"] =
    planCode === "anual" ? "YEARLY" : "MONTHLY";

  const valorTexto =
    planCode === "anual"
      ? "12x R$ 17,91 (cobrança anual R$ 214,92)"
      : "R$ 19,90 / mês";

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

      const customerPayload: ClientData = {
        name: user.name,
        email: user.email,
        mobilePhone: digits(user.phone),
        cpfCnpj: digits(user.cpfCnpj),
        externalReference: user.id,
      };

      const customer = await createCustomerMutation.mutateAsync(
        customerPayload
      );

      const { month, year } = splitExpiry(expiry);

      const signaturePayload: SignaturePayload = {
        userId: user.id,
        planId,
        asaasCustomerId: customer.id,
        billingType: "CREDIT_CARD",
        cycle,
        description: `${planDescription} - ${planCode}`,
        externalReference: user.id,
        nextDueDate: new Date().toISOString(),
        creditCard: {
          holderName: cardName,
          number: digits(cardNumber),
          expiryMonth: month,
          expiryYear: year,
          ccv: digits(cvv),
        },
        creditCardHolderInfo: {
          name: user.name,
          email: user.email,
          cpfCnpj: digits(user.cpfCnpj),
          phone: digits(user.phone),
        },
      };

      await axios.post("/api/signatures", signaturePayload, {
        withCredentials: true,
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(getErrorMessage(message));
      } else {
        console.error(err);
        setError("Ocorreu um erro inesperado ao criar a assinatura.");
      }
    } finally {
      setLoading(false);
    }
  };

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { value } = e.target;
  if (value) {
    setCardBrand(detectCardBrand(value));
    setCardNumber(value);
  }
};

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {success && (
        <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 rounded flex items-center gap-2 text-sm">
          <CheckCircle className="w-5 h-5" />
          Assinatura criada com sucesso! Seu pagamento foi aprovado. 🎉
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-2 justify-between lg:items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard /> Cartao de credito
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-2">
          <CheckoutCreditCard
            name={cardName }
            number={cardNumber}
            expiry={expiry}
            className="mb-4"
            brand={cardBrand}
          />
        </div>

        <div className="col-span-2 flex flex-col gap-4">
          <CleaveInput
            name="cardNumber"
            placeholder="Número do cartão"
            options={{ creditCard: true }}
            className={inputClasses}
            value={cardNumber}
            onChange={handleChange}
          />
          <div className="flex gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-200 text-sm">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-[#333C4D] mb-1">
            Resumo da assinatura
          </h3>
          <p>
            <strong>Plano:</strong> {planDescription} ({planCode})
          </p>
          <p>
            <strong>Valor:</strong> {valorTexto}
          </p>
          <p>
            <strong>Ciclo:</strong> {cycle === "YEARLY" ? "Anual" : "Mensal"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
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
          <p>
            <strong>CPF:</strong> {user.cpfCnpj}
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
        {loading
          ? "Processando..."
          : success
          ? "Assinatura criada"
          : "Confirmar pagamento"}
      </button>
    </div>
  );
}
